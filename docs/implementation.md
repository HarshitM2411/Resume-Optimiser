# Implementation Plan: AI-Powered Resume Customization System


> Phase-by-phase build plan derived from `architecture.md` and `context.md`.
> Each phase is independently shippable. Later phases are additive — no rewrites.


---


## Phase Map


| Phase | Theme | Key Output |
|---|---|---|
| **1** | Stateless MVP | Working product: upload → tailor → edit → PDF download |
| **2** | Persistence + Auth | User accounts, server-side version history, multi-resume |
| **3** | Polish + Reliability | Rate limiting, OAuth, S3, PDF preview |
| **4** | RAG / Experience Bank | Semantic retrieval from personal experience bank |


---


## Phase 1 — Stateless MVP


**Goal**: A fully functional, anonymous web app. No database. No login. Resume JSON lives in the browser. Backend is four pure-function endpoints.


**Success criteria**:
- Upload a PDF/DOCX → get back structured resume JSON.
- Paste a JD → receive a diff + proposed resume → accept → PDF downloads correctly.
- Make a prompt-based edit → diff shown → accept → PDF updates.
- Version history tracks accepted edits in memory for the session.
- All four endpoints return correct shapes and are covered by integration tests.


---


### Milestone 1.1 — Project Scaffolding


**Tasks**:


1. **Monorepo layout** — create the top-level directory structure from the codebase tree in `architecture.md § 3`:
   - `backend/`, `frontend/`, `infra/`, `docs/`
2. **Backend bootstrap**:
   - `pyproject.toml` with dependencies: `fastapi`, `uvicorn[standard]`, `pydantic[email]`, `pydantic-settings`, `groq`, `pymupdf`, `python-docx`, `python-magic`, `httpx`, `jinja2`, `structlog`, `beautifulsoup4`
   - `app/main.py`: FastAPI factory with `CORSMiddleware`, `TrustedHostMiddleware`, `HTTPSRedirectMiddleware`
   - `app/core/config.py`: `pydantic-settings` model reading `GROQ_API_KEY` from env; also reads `CORS_ORIGINS` (comma-separated allowed origins, defaults to `http://localhost:3000`) and `ALLOWED_HOSTS` for `TrustedHostMiddleware`
   - Health endpoint: `GET /healthz` → `{ "status": "ok" }`
3. **Frontend bootstrap**:
   - `create-next-app` with TypeScript, Tailwind CSS, App Router
   - `types/resume.ts` — TypeScript interfaces mirroring the Pydantic schema from `context.md § 3`
   - `lib/api.ts` — stub file with typed fetch wrappers (not yet wired)
4. **Docker Compose** (`infra/docker-compose.yml`):
   - `backend` service (port 8000, `GROQ_API_KEY` env, LaTeX template mounted `:ro`)
   - `tectonic` sidecar (`dxjoke/tectonic-docker:latest`, shared `tectonic_cache` volume)
   - `frontend` service (port 3000, `BACKEND_URL` env)
5. **Tectonic integration smoke test** — shell script that compiles a minimal `.tex` file using the Docker sidecar and asserts a PDF is produced.


**Acceptance**: `docker compose up` starts all three services; `/healthz` returns 200; Tectonic smoke test passes.


---


### Milestone 1.2 — Resume Ingestion (`POST /api/v1/parse`)


**Tasks**:


1. **`IngestionService`** (`services/ingestion/`):
   - `pdf_extractor.py`: open with `pymupdf`; detect password-protected / corrupted (catch `fitz.FileDataError`); check for text layer (reject scanned PDFs with explicit message); return raw text string.
   - `docx_extractor.py`: `python-docx` — extract paragraphs and all table cells in document order; return plain text string.
   - `txt_extractor.py`: UTF-8 decode; normalise whitespace; return plain text string. Reject non-UTF-8 files with a clear error.
   - `ingestion_service.py`: MIME sniff via `python-magic` (do not trust file extension); route to PDF / DOCX / TXT extractor; enforce 5 MB size cap before any extraction. Raw text is returned to the caller — it is **not persisted** (stateless MVP).
2. **LLM Client** (`services/llm/client.py`):
   - Async `LLMClient` class wrapping `groq.AsyncGroq`
   - Retry loop: up to 3 attempts, exponential backoff (1s, 2s), appends `ValidationError` message to prompt on each retry
   - Raises `LLMExhaustedError` after all attempts fail
3. **Resume Parser** (`services/llm/resume_parser.py`):
   - Prompt: system instruction mandating strict JSON output matching the `ResumeSchema`; include full schema definition in prompt
   - Calls `LLMClient.call()`; parses JSON from response; validates with `ResumeSchema.model_validate()`
   - Returns `ResumeSchema` instance
4. **Pydantic domain models** (`models/domain/resume.py`):
   - `ContactSchema`, `WorkExperienceEntry`, `EducationEntry`, `SkillsSchema`, `ProjectEntry`, `ResumeSchema` — all optional fields nullable; `contact` required
5. **Router** (`api/v1/routers/parse.py`):
   - `POST /api/v1/parse` — accepts `multipart/form-data` with `file` field
   - Calls `IngestionService` → `ResumeParser` → returns `{ "resume_json": ResumeSchema }`
   - Maps service exceptions to correct HTTP status codes (see error taxonomy in `architecture.md § 13`)
6. **Unit tests**:
   - `IngestionService`: test scanned PDF rejection, password-protected PDF rejection, >5MB rejection, DOCX table extraction, TXT UTF-8 decode
   - `ResumeParser`: mock `LLMClient`; test retry logic (model: `llama-3.3-70b-versatile`); test validation failure after 3 retries raises `LLMExhaustedError`


**Acceptance**: `POST /api/v1/parse` with a real 2-page PDF returns a valid `ResumeSchema` JSON body within 15 seconds.


---


### Milestone 1.3 — JD Analyzer + SSRF URL Fetcher


**Tasks**:


1. **JD domain models** (`models/domain/jd.py`):
   - `JDAnalysisSchema`: `role_title`, `must_have_skills`, `nice_to_have_skills`, `keywords`, `seniority`, `tone`, `responsibilities`
2. **JD Analyzer** (`services/llm/jd_analyzer.py`):
   - Prompt: extract structured JD fields from raw text; output must validate against `JDAnalysisSchema`
   - Uses `LLMClient` with same retry logic
3. **SSRF-safe URL fetcher** (`services/storage/url_fetcher.py`):
   - Enforce HTTPS scheme; DNS-resolve hostname; validate resolved IP against all private/loopback/metadata ranges (RFC 1918, `127.0.0.0/8`, `169.254.0.0/16`, `::1/128`, `fc00::/7`)
   - Fetch with `httpx.AsyncClient(timeout=10.0, follow_redirects=False)`
   - Pass response body to `extract_text_from_html()` (see below); return plain text
   - Raises `SSRFError` on any blocked condition
4. **`extract_text_from_html()`** (utility, same file or `services/storage/html_extractor.py`):
   - Parse raw HTML with `BeautifulSoup(html, "html.parser")`; remove `<script>` and `<style>` tags; call `.get_text(separator=" ")`; normalise whitespace
   - Used exclusively by `url_fetcher.py`
5. **Unit tests**:
   - URL fetcher: test each blocked range, non-HTTPS rejection, timeout handling
   - `extract_text_from_html`: strips script/style tags, returns normalised plain text
   - JD Analyzer: mock `LLMClient`; assert output validates against `JDAnalysisSchema`


**Acceptance**: `url_fetcher` blocks all RFC 1918 addresses and the cloud metadata IP; passes for a real public HTTPS URL.


---


### Milestone 1.4 — Tailoring Tools + Orchestrator (`POST /api/v1/tailor`)


**Tasks**:


1. **`BaseTool` protocol** (`services/tailoring/tools/base.py`):
   - Abstract base class (or `typing.Protocol`) with a single method: `async def invoke(self, resume: ResumeSchema, section: str, params: dict) -> dict`
   - All five tools inherit from / implement this interface; `TOOL_REGISTRY` is typed as `dict[tuple[str, str], type[BaseTool]]`
2. **Diff model** (`models/domain/diff.py`):
   - `DiffItem`: `section: str`, `before: Any`, `after: Any`
   - `PendingEditResponse`: `proposed_resume_json: ResumeSchema`, `diff: list[DiffItem]`
3. **`compute_diff()`** utility: compare two `ResumeSchema` instances field-by-field; produce a `list[DiffItem]` for every field that changed.
4. **`merge_fragment()`** utility: given a `ResumeSchema`, a section name, and an updated fragment dict, return a new `ResumeSchema` with that section replaced.
5. **Tailoring tools** (`services/tailoring/tools/`):
   - `jd_tailor.py`: full-resume rewrite aligned to JD; prompt grounds LLM in existing content only (no fabrication instruction); outputs full `ResumeSchema`
   - `section_rewriter.py`: rewrites one section per instruction; outputs updated section fragment
   - `entry_builder.py`: parses freeform instruction into a structured entry (work experience or project); outputs typed entry dict
   - `bullet_editor.py`: rewrites a single bullet string per instruction
   - `entry_remover.py`: pure Python — finds entry by index/identifier and removes it; no LLM call
6. **Orchestrator** (`services/tailoring/orchestrator.py`):
   - `TOOL_REGISTRY` dict mapping `(section, action)` → tool class (see `architecture.md § 8.1`)
   - `orchestrate()`: look up tool, invoke, merge fragment, compute diff, return `PendingEditResponse`
   - Returns HTTP 422 for unknown `(section, action)` pairs
7. **Tailor router** (`api/v1/routers/tailor.py`):
   - `POST /api/v1/tailor` — body: `{ resume_json, jd_text?, jd_url? }` (one of the two required)
   - Calls `url_fetcher` if `jd_url` provided → `JDAnalyzer` → `Orchestrator(jd_tailor)` → returns `PendingEditResponse`
8. **Unit tests**:
   - Each tool: mock `LLMClient`; verify output schema; verify `entry_remover` requires no LLM call
   - Orchestrator: test unknown section/action → 422; test correct tool is dispatched per registry entry
   - Tailor router: test missing both `jd_text` and `jd_url` → 422


**Acceptance**: `POST /api/v1/tailor` with a real resume + JD returns a valid diff and proposed resume within 30 seconds.


---


### Milestone 1.5 — Prompt-Based Edit (`POST /api/v1/edit`)


**Tasks**:


1. **Edit router** (`api/v1/routers/edit.py`):
   - `POST /api/v1/edit` — body: `{ resume_json, section, action, instruction }`
   - Calls `Orchestrator.orchestrate()` → returns `PendingEditResponse`
   - Invalid `(section, action)` → HTTP 422 with message `"Unsupported section/action combination."`
2. **Integration test**: send a real edit request against a mock LLM; verify diff shape and proposed resume are valid.


**Acceptance**: `POST /api/v1/edit` with `section=summary`, `action=rewrite` returns a diff and updated resume.


---


### Milestone 1.6 — LaTeX Rendering + PDF (`POST /api/v1/pdf`)


**Tasks**:


1. **`escape_latex()`** (`services/rendering/latex_formatter.py`):
   - Escapes all ten special chars in the correct order (backslash first): `\ & % $ # _ { } ^ ~`
   - Unit test: verify each char is escaped correctly; verify double-escaping cannot occur
2. **Section formatters**: one function per resume section that converts a Python dict/list into a valid LaTeX string fragment (e.g., `format_work_experience()`, `format_skills()`)
3. **Jinja2 template renderer**:
   - Load `resume.tex` via `jinja2.FileSystemLoader`; `autoescape=False`; `StrictUndefined`
   - Render with formatted + escaped section strings
4. **`resume.tex`** template (`backend/app/templates/resume.tex`):
   - Single-column LaTeX template with named placeholders for each section (`{{ contact_block }}`, `{{ summary }}`, etc.)
   - Template is the single source of truth for PDF layout; never modified at runtime
5. **`compile_pdf()`** (`services/rendering/pdf_compiler.py`):
   - Write rendered `.tex` to isolated `tempfile.TemporaryDirectory()`
   - Invoke Tectonic via `asyncio.create_subprocess_exec`; 30-second timeout
   - On non-zero exit: log `stderr`, raise `PDFCompilationError`
   - On success: read and return PDF bytes
6. **PDF router** (`api/v1/routers/pdf.py`):
   - `POST /api/v1/pdf` — body: `{ resume_json }`
   - Calls `latex_formatter` → `compile_pdf()` → returns `StreamingResponse(content=pdf_bytes, media_type="application/pdf")` with `Content-Disposition: attachment; filename="resume.pdf"`
7. **Unit tests**:
   - `escape_latex`: all special chars, strings with multiple specials, empty string
   - `latex_formatter`: every section type produces syntactically valid LaTeX (no unescaped specials)
8. **Integration test**: end-to-end — upload a resume, call `/api/v1/pdf` with the returned JSON, assert response is a non-empty PDF (`%PDF-` magic bytes).


**Acceptance**: `POST /api/v1/pdf` returns a valid PDF within 10 seconds for a standard 2-page resume JSON.


---


### Milestone 1.7 — Frontend


**Tasks**:


1. **`app/layout.tsx`** (root layout):
   - Wraps the entire app in `<ResumeContextProvider>`
   - Sets `<html lang="en">`, global Tailwind base styles, and any shared metadata
2. **React context** (`app/context/ResumeContext.tsx`):
   - `AppState`: `resumeJson`, `versionStack`, `pendingEdit`
   - `acceptEdit()` and `discardEdit()` reducers (from `architecture.md § 5.2`)
   - Provider wraps the entire app
3. **`UploadZone` component**:
   - Drag-and-drop + file picker; validates file type and size client-side before sending
   - Calls `POST /api/v1/parse`; on success: sets `resumeJson` in context → navigates to `/editor`
   - Loading spinner during request; maps API error codes to user-facing messages
4. **Landing page** (`app/page.tsx`):
   - Renders `UploadZone`; no auth gate
5. **`ResumeEditor` + `SectionPanel` components**:
   - Renders all sections of `resumeJson` from context
   - Each section has an `[edit]` affordance that opens the `SectionEditor` bar
6. **`SectionEditor` component**:
   - Section dropdown, action-type dropdown, instruction textarea, **Apply** button
   - JD paste / URL input with **Tailor** button
   - Calls `POST /api/v1/edit` or `POST /api/v1/tailor`; on success: sets `pendingEdit` in context
   - Shows loading spinner during in-flight request; disables Apply/Tailor buttons to prevent double-submit
   - LLM-backed calls (`/tailor`, `/edit`) can take up to 30 s — use `AbortController` with a 60 s client-side timeout; surface a timeout toast if exceeded
7. **`DiffViewer` component**:
   - Modal overlay; renders when `pendingEdit` is non-null; blocks all other interaction
   - Two-column before/after table
   - **Accept Changes**: calls `acceptEdit()` in context; **Discard**: calls `discardEdit()`
8. **`VersionHistory` component**:
   - Renders `versionStack` entries (label + timestamp)
   - Read-only in MVP (no restore UI)
9. **PDF download button**:
   - Calls `POST /api/v1/pdf` with current `resumeJson`; receives blob; triggers browser download
10. **Editor page** (`app/editor/page.tsx`):
    - Assembles `ResumeEditor`, `SectionEditor` bar, `DiffViewer`, `VersionHistory`, download button
    - Redirects to `/` if `resumeJson` is null (e.g. page refreshed — session state lost)
11. **`lib/api.ts`** — implement all four typed fetch wrappers: `parseResume`, `tailorResume`, `editResume`, `downloadPdf`; each wrapper propagates `AbortSignal` for timeout cancellation


**Acceptance**: Full user journey works end-to-end in browser: upload → tailor for a JD → accept → prompt edit → accept → download PDF.


---


### Milestone 1.8 — Hardening & Launch Readiness


**Tasks**:


1. **Structured logging** — wire `structlog` into all service calls; emit JSON log lines with `service`, `operation`, `duration_ms`, `error` fields (from `architecture.md § 13.3`). `user_id` and `resume_id` fields are **omitted / null in MVP** (stateless — no user accounts, no server-side IDs); include them as optional fields so Phase 2 can populate them without changing the log schema
2. **Error boundary** (frontend) — React error boundary wrapping editor; surface API errors as toasts, not white screens
3. **Full integration test suite**: upload → tailor → edit → pdf, hitting real Docker services
4. **nginx config** (`infra/nginx/nginx.conf`): reverse proxy, HTTPS termination (self-signed for local dev), HSTS header, forward to backend/frontend by path prefix
5. **README**: setup instructions, `docker compose up` walkthrough, env var list


**Acceptance**: All unit and integration tests pass; `docker compose up` produces a working product from a clean clone with only `GROQ_API_KEY` set.


---


## Phase 2 — Persistence + Auth


**Goal**: Users can create accounts, save resumes server-side, and access version history across sessions.


**Prerequisites**: Phase 1 complete and stable.


**Key additions**:
- PostgreSQL (primary + async replica)
- `DATABASE_URL` env var; async SQLAlchemy + Alembic
- `users` table, `resumes` table (JSONB column), `resume_versions` table
- Email/password registration + login; short-lived JWTs (RS256); server-side refresh token rotation
- `verify_jwt` → `get_db_session` → `get_current_user` → `check_resume_ownership` FastAPI dependency chain
- All four endpoints gain auth requirement; `resume_json` is no longer sent in every body — replaced by `resume_id`
- `versionStack` in frontend replaced by API calls to `POST /api/v1/resumes/{id}/versions`
- Version restore endpoint: `POST /api/v1/resumes/{id}/versions/{version_id}/restore`
- Frontend: `/login` and `/register` pages (email/password); protected route wrapper
- Alembic migration for initial schema


**Out of scope for Phase 2**: OAuth, S3, rate limiting, multi-template.


---


## Phase 3 — Polish + Reliability


**Goal**: Production-hardened system with rate limiting, OAuth login, and object storage for PDFs.


**Prerequisites**: Phase 2 complete.


**Key additions**:


| Feature | Implementation |
|---|---|
| OAuth login | Auth.js (NextAuth) Google + GitHub providers; link to existing account by email |
| Per-user rate limiting | Token usage tracked in PostgreSQL per `(user_id, operation_type, month)` — NFR-10; warning at 80%, block at 100% |
| S3 PDF storage | On "Accept Changes": compile PDF → upload to S3 → store presigned URL in version record; download button fetches presigned URL |
| In-browser PDF preview | Stream PDF to `<iframe>` or use `react-pdf`; PNG thumbnail generation |
| SSE progress streaming | Replace synchronous `/tailor` and `/parse` responses with SSE streams; frontend shows live progress steps |
| GDPR self-service deletion | `DELETE /api/v1/me` — cascade-delete all user data (DB rows + S3 objects) within 30 days of request |


---


## Phase 4 — RAG / Experience Bank


**Goal**: Users can maintain a personal experience bank; relevant entries are surfaced during tailoring.


**Prerequisites**: Phase 2 complete (needs `user_id` and persistence).


**Key additions**:


1. **`experience_bank` table** — `id`, `user_id`, `entry_type`, `entry_json` (JSONB), `embedding` (pgvector vector(1536)), `source`, `created_at`; ivfflat index on embedding column.
2. **Embedding service** — `text-embedding-3-small` (OpenAI) or equivalent; embed on entry insert/update; re-embed on `entry_json` change.
3. **`rag_retriever` tool** — embed JD `responsibilities` + `must_have_skills`; cosine search `experience_bank` for top-k (default 5); return candidates.
4. **User approval UI** — before tailoring, surface retrieved entries as checkboxes; only checked entries are injected into the resume JSON passed to `jd_tailor`.
5. **"Promote to bank" action** — after accepting an edit, allow user to promote any new work experience or project entry directly to their experience bank.
6. **Opt-in gate** — experience bank is off by default; user must enable it in settings.


**Key rule** (from architecture): the system never auto-inserts from the experience bank. Every retrieval requires explicit user approval before injection.


---


## Cross-Phase Constraints


These rules apply across all phases and must never be violated:


| Rule | Enforcement |
|---|---|
| LLM outputs JSON only — never LaTeX, HTML, or code | System prompt instruction + Pydantic validation on every LLM call |
| `resume.tex` is read-only at runtime | Docker volume `ro` flag + `chmod 444` in image build |
| `escape_latex()` applied to all user strings before template injection | Code review gate; unit test with adversarial inputs |
| SSRF protection on every URL fetch | `url_fetcher.py` is the only allowed HTTP client for external URLs |
| No fabrication | Every tailoring/rewriting prompt explicitly instructs: "Do not add experience, skills, or facts not present in the source resume." |
| Fail loudly | Validation failures after retries surface to user; no silent partial saves at any phase |