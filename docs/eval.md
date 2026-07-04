# Evaluation Plan: AI-Powered Resume Customization System


> Structured evaluation criteria, acceptance gates, and test strategies derived from `architecture.md` and `implementation.md`.
> Each section maps to the corresponding milestone or phase.


---


## Table of Contents


1. [Evaluation Philosophy](#1-evaluation-philosophy)
2. [Phase 1 — Stateless MVP](#2-phase-1--stateless-mvp)
   - [Milestone 1.1 — Project Scaffolding](#milestone-11--project-scaffolding)
   - [Milestone 1.2 — Resume Ingestion](#milestone-12--resume-ingestion)
   - [Milestone 1.3 — JD Analyzer + URL Fetcher](#milestone-13--jd-analyzer--url-fetcher)
   - [Milestone 1.4 — Tailoring Orchestrator](#milestone-14--tailoring-orchestrator)
   - [Milestone 1.5 — Prompt-Based Edit](#milestone-15--prompt-based-edit)
   - [Milestone 1.6 — LaTeX + PDF](#milestone-16--latex--pdf)
   - [Milestone 1.7 — Frontend](#milestone-17--frontend)
   - [Milestone 1.8 — Hardening](#milestone-18--hardening)
3. [Phase 2 — Persistence + Auth](#3-phase-2--persistence--auth)
4. [Phase 3 — Polish + Reliability](#4-phase-3--polish--reliability)
5. [Phase 4 — RAG / Experience Bank](#5-phase-4--rag--experience-bank)
6. [Cross-Phase Invariants](#6-cross-phase-invariants)
7. [Performance Benchmarks](#7-performance-benchmarks)
8. [Security Evaluation](#8-security-evaluation)


---


## 1. Evaluation Philosophy


Every milestone ships a testable artifact. Acceptance criteria are **binary** — a milestone either passes all criteria or it does not ship. No partial credit.


| Principle | Meaning |
|---|---|
| **Fail loudly** | Validation failures must surface to the user. Silent partial success is a defect. |
| **Schema-first** | Every LLM output must pass Pydantic validation before it leaves the service layer. |
| **No fabrication** | Tailoring tools must not introduce facts not present in the source resume. Evaluated by diff inspection. |
| **Reversibility** | Every accepted edit pushes the previous state to `versionStack`. Undo must always be possible within the session. |
| **Security by default** | SSRF protection, LaTeX escaping, and MIME sniffing are non-negotiable in every build. |


---


## 2. Phase 1 — Stateless MVP


### Milestone 1.1 — Project Scaffolding


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.1.1 | `docker compose up` starts all three services without errors | `docker compose up --build`; check exit codes |
| 1.1.2 | `GET /healthz` returns `{ "status": "ok" }` with HTTP 200 | `curl http://localhost:8000/healthz` |
| 1.1.3 | Frontend is reachable at `http://localhost:3000` | Browser or `curl -I http://localhost:3000` |
| 1.1.4 | Tectonic smoke test produces a valid PDF | Run the shell script; assert file ends in `%EOF` and is non-empty |
| 1.1.5 | `pyproject.toml` lists all required dependencies | Diff against the dependency list in `implementation.md § 1.1.2` |
| 1.1.6 | `types/resume.ts` interfaces mirror `ResumeSchema` fields exactly | Manual schema comparison |
| 1.1.7 | `lib/api.ts` stub file exists with typed function signatures | File presence + TypeScript compilation passes |
| 1.1.8 | `config.py` reads `CORS_ORIGINS` (comma-separated, default `http://localhost:3000`) and `ALLOWED_HOSTS` from env | Inspect `app/core/config.py`; verify both fields present with defaults |


**Test suite**: No automated unit tests in 1.1. Validation is structural + smoke.


---


### Milestone 1.2 — Resume Ingestion


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.2.1 | `POST /api/v1/parse` with a real 2-page text PDF returns valid `ResumeSchema` JSON | Integration test; Pydantic parse the response |
| 1.2.2 | Response arrives within 15 seconds on standard hardware | Time the request end-to-end |
| 1.2.3 | All unit tests in `tests/unit/` for `IngestionService` pass | `pytest tests/unit/test_ingestion.py` |
| 1.2.4 | All unit tests for `ResumeParser` pass | `pytest tests/unit/test_resume_parser.py` |
| 1.2.5 | MIME sniffing routes a `.pdf`-named DOCX to the DOCX extractor (not rejected) | Send DOCX renamed to `.pdf`; assert HTTP 200 with valid `ResumeSchema` — file extension is ignored |
| 1.2.6 | Files >5 MB are rejected before extraction begins | Send a 6 MB file; assert HTTP 413 returned immediately |


**Unit test coverage requirements**:


| Test | Assertion |
|---|---|
| Scanned PDF (no text layer) | HTTP 422, message contains "scanned image" |
| Password-protected PDF | HTTP 422, message contains "password-protected" |
| File > 5 MB | HTTP 413 |
| DOCX table extraction | All table cell text present in `raw_text` |
| TXT file UTF-8 decode | Text extracted and whitespace normalised correctly |
| TXT file non-UTF-8 encoding | HTTP 422 with clear encoding error message |
| LLM retry on `ValidationError` | `LLMClient.call()` invoked exactly 3 times before `LLMExhaustedError` |
| `ResumeSchema.contact` is present | Parsed resume has non-null `contact` field |


**LLM response quality check** (manual, one-time per model version):
- Upload a 2-page standard resume; confirm that `work_experience`, `education`, `skills`, `summary`, and `contact` fields are all populated without hallucination.


---


### Milestone 1.3 — JD Analyzer + URL Fetcher


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.3.1 | `url_fetcher` blocks all RFC 1918 addresses | Automated unit tests; assert `SSRFError` raised |
| 1.3.2 | `url_fetcher` blocks `169.254.169.254` (cloud metadata) | Unit test |
| 1.3.3 | Non-HTTPS URLs raise `SSRFError` | Unit test with `http://` URL |
| 1.3.4 | A valid public HTTPS URL returns plain text | Integration test with a known stable public URL |
| 1.3.5 | `JDAnalyzer` output validates against `JDAnalysisSchema` | Unit test with mocked `LLMClient` |


**Unit test coverage requirements**:


| Test | Assertion |
|---|---|
| Private range `10.0.0.0/8` | `SSRFError` raised |
| Private range `172.16.0.0/12` | `SSRFError` raised |
| Private range `192.168.0.0/16` | `SSRFError` raised |
| Loopback `127.0.0.1` | `SSRFError` raised |
| Link-local `169.254.169.254` | `SSRFError` raised |
| IPv6 loopback `::1` | `SSRFError` raised |
| ULA `fc00::1` | `SSRFError` raised |
| HTTP (not HTTPS) | `SSRFError` raised |
| Timeout (10s exceeded) | `httpx.TimeoutException` propagated or mapped to user-friendly error |
| `extract_text_from_html` strips `<script>` tags | Script content absent from returned plain text |
| `extract_text_from_html` strips `<style>` tags | CSS rules absent from returned plain text |
| `extract_text_from_html` normalises whitespace | Multiple spaces/newlines collapsed; output is clean single-space-separated text |
| `JDAnalyzer` validates output schema | `JDAnalysisSchema.model_validate()` succeeds on mocked LLM output |


---


### Milestone 1.4 — Tailoring Orchestrator


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.4.0 | `BaseTool` abstract base class exists at `services/tailoring/tools/base.py` with correct `invoke` signature | File presence + import check; all five tools inherit / implement it |
| 1.4.1 | `POST /api/v1/tailor` with real resume + JD text returns valid `PendingEditResponse` | Integration test; validate both `proposed_resume_json` and `diff` |
| 1.4.2 | Response arrives within 30 seconds | Time the request |
| 1.4.3 | Unknown `(section, action)` pair returns HTTP 422 | Unit test the orchestrator |
| 1.4.4 | `entry_remover` makes zero LLM calls | Mock `LLMClient`; assert it is never invoked |
| 1.4.5 | `compute_diff()` produces a `DiffItem` for every changed field | Unit test with two known `ResumeSchema` instances |
| 1.4.6 | Missing both `jd_text` and `jd_url` returns HTTP 422 | Unit/integration test |


**Unit test coverage requirements**:


| Test | Assertion |
|---|---|
| Each tool (mocked LLM) | Output validates against expected schema |
| `compute_diff` — identical resumes | Returns empty list `[]` |
| `compute_diff` — summary changed | Returns one `DiffItem` with correct `before`/`after` |
| `merge_fragment` | Replaces target section only; other sections unchanged |
| `orchestrate` — known key | Correct tool class instantiated |
| `orchestrate` — unknown key | HTTP 422 with exact message `"Unsupported section/action combination."` |
| `tailor` router — `jd_url` path | `url_fetcher` called once; `JDAnalyzer` called with fetched text |


---


### Milestone 1.5 — Prompt-Based Edit


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.5.1 | `POST /api/v1/edit` with `section=summary`, `action=rewrite` returns valid diff and updated resume | Integration test |
| 1.5.2 | Invalid `(section, action)` returns HTTP 422 with message `"Unsupported section/action combination."` | Integration test |
| 1.5.3 | `proposed_resume_json` is a valid `ResumeSchema` | Pydantic parse in test assertion |


**Integration test scenario**:


```
Input:
  resume_json: { summary: "Experienced backend engineer.", ... }
  section: "summary"
  action: "rewrite"
  instruction: "Make it more concise and highlight Python expertise."


Expected:
  HTTP 200
  diff[0].section == "summary"
  diff[0].before == "Experienced backend engineer."
  proposed_resume_json.summary != "Experienced backend engineer."
  proposed_resume_json passes ResumeSchema.model_validate()
```


---


### Milestone 1.6 — LaTeX + PDF


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.6.1 | `POST /api/v1/pdf` returns a non-empty PDF within 10 seconds | Check `Content-Type: application/pdf` and magic bytes `%PDF-` |
| 1.6.2 | All `escape_latex()` unit tests pass | `pytest tests/unit/test_latex_formatter.py` |
| 1.6.3 | Each section formatter produces syntactically valid LaTeX | Compile the fragment output with Tectonic; no error |
| 1.6.4 | End-to-end integration test: parse → pdf | Assert `%PDF-` magic bytes in response body |
| 1.6.5 | `Content-Disposition` header is `attachment; filename="resume.pdf"` | Check response headers |


**Unit test coverage requirements — `escape_latex()`**:


| Input | Expected Output |
|---|---|
| `\\` | `\textbackslash{}` |
| `&` | `\&` |
| `%` | `\%` |
| `$` | `\$` |
| `#` | `\#` |
| `_` | `\_` |
| `{` | `\{` |
| `}` | `\}` |
| `^` | `\^{}` |
| `~` | `\textasciitilde{}` |
| `C++ & Python` | `C\textbackslash{}\textbackslash{} \& Python` — no double-escape |
| Empty string `""` | `""` |
| String with all ten specials | All escaped; no raw special chars remain |


---


### Milestone 1.7 — Frontend


**Acceptance Gate** — Full user journey works end-to-end in browser:


| # | Step | Pass Criterion |
|---|---|---|
| 1.7.0 | `app/layout.tsx` wraps entire app in `<ResumeContextProvider>`; sets `<html lang="en">` and global Tailwind styles | File present; layout renders correctly in browser |
| 1.7.1 | Upload a PDF | File accepted; `/editor` page loads with resume sections visible |
| 1.7.2 | Tailor for a JD | Diff viewer modal appears; before/after content displayed |
| 1.7.3 | Accept changes | Modal closes; editor reflects updated resume; version entry added |
| 1.7.4 | Apply a prompt edit | Diff viewer appears again |
| 1.7.5 | Accept second edit | Second version entry in history |
| 1.7.6 | Download PDF | Browser download triggers; file opens in PDF viewer without errors |
| 1.7.7 | Refresh editor page | Redirect to `/` (session state lost by design) |
| 1.7.8 | Discard a pending edit | Modal closes; resume unchanged; no version added |


**Component-level checks**:


| Component | Check |
|---|---|
| `UploadZone` | Rejects files >5 MB before sending to backend |
| `UploadZone` | Rejects non-PDF/DOCX MIME types client-side |
| `UploadZone` | Shows loading spinner during `POST /api/v1/parse` |
| `DiffViewer` | Blocks interaction with editor while open |
| `DiffViewer` | **Accept** and **Discard** both dismiss the modal |
| `VersionHistory` | Entry count increments on each accepted edit |
| `SectionEditor` | **Apply** button disabled when instruction is empty |
| `SectionEditor` | **Tailor** button requires either JD text or valid URL |
| `SectionEditor` | Apply/Tailor buttons disabled while a request is in flight (prevent double-submit) |
| `SectionEditor` | `AbortController` created with 60s timeout for every LLM-backed call (`/tailor`, `/edit`) |
| `SectionEditor` | Timeout toast shown if 60s client-side limit is exceeded |
| `lib/api.ts` | All four fetch wrappers accept and propagate `AbortSignal` for cancellation |


---


### Milestone 1.8 — Hardening


**Acceptance Gate** (all must pass):


| # | Check | How to Verify |
|---|---|---|
| 1.8.1 | Full integration test suite passes (parse → tailor → edit → pdf) | `pytest tests/integration/` against live Docker services |
| 1.8.2 | All unit tests pass | `pytest tests/unit/` |
| 1.8.3 | Structured JSON logs emitted for every service call | Inspect `docker compose logs backend`; assert JSON lines with required fields |
| 1.8.4 | Frontend error boundary catches API errors and shows toast (not white screen) | Simulate 502 from backend; verify toast appears |
| 1.8.5 | nginx reverse proxy routes `/api/*` to backend, all other paths to frontend | `curl https://localhost/healthz` returns 200 |
| 1.8.6 | HSTS header present in nginx responses | `curl -I https://localhost` shows `Strict-Transport-Security` |
| 1.8.7 | README `docker compose up` walkthrough produces a working product from clean clone | Follow instructions on a clean machine with only `ANTHROPIC_API_KEY` set |


**Log field check** — each log line must contain:
- `timestamp` (ISO-8601)
- `level` (`INFO`, `WARNING`, or `ERROR`)
- `service` (non-empty string)
- `operation` (non-empty string)
- `duration_ms` (integer)
- `error` (null or string)
- `user_id` (optional field; **null in MVP** — stateless, no accounts; included so Phase 2 can populate without schema change)
- `resume_id` (optional field; **null in MVP** — same rationale)


---


## 3. Phase 2 — Persistence + Auth


**Prerequisite**: All Phase 1 milestones accepted.


**Acceptance Gate**:


| # | Check |
|---|---|
| 2.1 | User can register with email/password; record persisted in `users` table |
| 2.2 | Login returns short-lived JWT (RS256); refresh token issued and stored server-side |
| 2.3 | Expired access token is rejected; refresh token rotates on use |
| 2.4 | `POST /api/v1/parse` without valid JWT returns HTTP 401 |
| 2.5 | User cannot access another user's resume (`check_resume_ownership` returns HTTP 403) |
| 2.6 | Version history persists across sessions (reload → history still present) |
| 2.7 | Version restore endpoint correctly replaces current resume JSON |
| 2.8 | Alembic migration runs cleanly from zero: `alembic upgrade head` |
| 2.9 | All Phase 1 integration tests still pass with auth header added |


**Security checks**:


| Check | Method |
|---|---|
| JWT `alg: none` attack rejected | Send token with `alg: none`; expect 401 |
| Refresh token cannot be reused after rotation | Replay old refresh token; expect 401 |
| IDOR: user A cannot read user B's resume | Attempt cross-user `resume_id` in request; expect 403 |


---


## 4. Phase 3 — Polish + Reliability


**Prerequisite**: Phase 2 accepted.


**Acceptance Gate**:


| # | Check |
|---|---|
| 3.1 | OAuth login (Google/GitHub) completes without error; account linked by email |
| 3.2 | Rate limit warning appears at 80% of monthly token budget |
| 3.3 | API calls are blocked at 100% of monthly token budget with informative message |
| 3.4 | PDF is uploaded to S3 on accept; presigned URL returned; download works |
| 3.5 | `DELETE /api/v1/me` removes all DB rows and S3 objects for the requesting user |
| 3.6 | SSE streaming endpoint emits progress events; frontend shows live steps |
| 3.7 | In-browser PDF preview renders without blank pages |


---


## 5. Phase 4 — RAG / Experience Bank


**Prerequisite**: Phase 2 accepted.


**Acceptance Gate**:


| # | Check |
|---|---|
| 4.1 | Opt-in toggle activates experience bank; off by default |
| 4.2 | New work experience entry can be promoted to experience bank |
| 4.3 | Tailoring with experience bank active surfaces top-k candidates in approval UI |
| 4.4 | Unchecked candidates are NOT injected into the resume passed to `jd_tailor` |
| 4.5 | Checked candidates ARE present in the `jd_tailor` prompt |
| 4.6 | `embedding` column is populated on insert and re-populated on `entry_json` update |
| 4.7 | Cosine search returns results ordered by similarity score descending |
| 4.8 | No auto-injection without explicit user approval — verified by integration test |


---


## 6. Cross-Phase Invariants


These checks must pass after every milestone delivery:


| Invariant | Verification Method |
|---|---|
| LLM outputs are never raw HTML, LaTeX, or code | Assert all LLM responses pass `json.loads()` before Pydantic validation |
| `escape_latex()` is applied to all user strings before template injection | Code review + unit test with adversarial inputs |
| `resume.tex` is never modified at runtime | Check volume mount is `:ro`; verify `stat` permissions are `444` in container |
| SSRF protection enforced on every external URL fetch | All external fetches must go through `url_fetcher.py` — grep for `httpx.get` calls outside this file |
| No fabrication in tailoring prompts | Manual spot-check: diff shows no new companies, degrees, or skills not in source resume |
| `LLMExhaustedError` after 3 retries surfaces to user | Integration test that injects three consecutive `ValidationError`s; assert HTTP 502 returned |


---


## 7. Performance Benchmarks


| Operation | Target (p50) | Measured At |
|---|---|---|
| `POST /api/v1/parse` — 2-page PDF | < 15 s | Milestone 1.2 |
| `POST /api/v1/tailor` — full resume + JD | < 30 s | Milestone 1.4 |
| `POST /api/v1/edit` — single section rewrite | < 15 s | Milestone 1.5 |
| `POST /api/v1/pdf` — 2-page resume JSON | < 10 s | Milestone 1.6 |
| `url_fetcher` — public HTTPS URL | < 10 s (timeout) | Milestone 1.3 |
| Frontend initial page load (LCP) | < 2.5 s | Milestone 1.7 |


Benchmarks are measured on a single developer machine (M-series or equivalent). Cloud targets will be tighter and defined separately in Phase 2.


---


## 8. Security Evaluation


Run after every milestone that touches networking, file handling, or LLM calls.


| Check | Tool / Method |
|---|---|
| SSRF — all private ranges blocked | Automated unit tests in `test_url_fetcher.py` |
| LaTeX injection — all 10 special chars escaped | `test_escape_latex.py` with adversarial inputs |
| File upload MIME sniffing — extension spoofing caught | Send DOCX as `.pdf`; expect HTTP 415 |
| File size limit enforced before extraction | Send 6 MB file; expect HTTP 413 with no file read |
| Tectonic subprocess uses no `shell=True` | Code review — `asyncio.create_subprocess_exec` only |
| No credentials in logs | Grep log output for `ANTHROPIC_API_KEY` value |
| CORS origin restricted to Next.js origin | `curl -H "Origin: http://evil.com"` → response must not echo `evil.com` |
| `TrustedHostMiddleware` blocks unexpected hosts | Send request with `Host: evil.com`; expect 400 |