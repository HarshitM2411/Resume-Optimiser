# Context: AI-Powered Resume Customization System


> Developer-facing reference. Distilled from `problemStatement.md`. Read this before writing any code.


---


## 1. What We Are Building


A web application that takes a candidate's existing resume, compares it against a job description, and produces a tailored, professionally formatted PDF — always rendered from a fixed LaTeX template. Users can further refine the resume via natural-language prompts. Every edit is versioned and reversible.


**This is not a resume builder.** It is a resume optimizer that operates on an existing candidate profile.


---


## 2. Technology Stack


| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| LLM | Claude Sonnet 4.6 via Anthropic API |
| Resume DB | None (MVP) — resume JSON held in browser; persistence in Phase 2 |
| Vector store (Phase 4 only) | pgvector — not required in MVP |
| File storage | None (MVP) — PDFs streamed on demand; no object storage |
| LaTeX compiler | Tectonic (Docker container, isolated per request) |
| PDF preview | None (MVP) — PDF streamed as direct download; no in-browser preview |
| Frontend | Next.js (React) |
| Template engine | Jinja2 (JSON → LaTeX fragment rendering) |
| Schema validation | Pydantic v2 |
| Auth | None (MVP) — anonymous; auth introduced in Phase 2 |


---


## 3. Resume Data Model


All LLM output and edits are stored as this JSON structure. `contact` is required; all other top-level sections are optional.


```json
{
  "contact": {
    "name": "string",
    "email": "string",
    "phone": "string | null",
    "location": "string | null",
    "linkedin": "string | null",
    "github": "string | null",
    "website": "string | null"
  },
  "summary": "string | null",
  "work_experience": [
    {
      "company": "string",
      "title": "string",
      "duration": "string",
      "location": "string | null",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string | null",
      "graduation_year": "string | null"
    }
  ],
  "skills": {
    "languages": ["string"],
    "frameworks": ["string"],
    "tools": ["string"],
    "other": ["string"]
  },
  "projects": [
    {
      "name": "string",
      "description": "string",
      "tech_stack": ["string"],
      "url": "string | null"
    }
  ],
  "achievements": ["string"],
  "certifications": ["string"]
}
```


**Schema versioning**: every version record in PostgreSQL stores a `schema_version` field. If the schema changes, a migration script must run before deployment. Raw extracted text is always retained (FR-05) as the re-parse fallback.


---


## 4. Core Request Flows


### Resume Upload
```
Upload (PDF / DOCX / TXT, max 5MB)
  → Password/corruption check → reject if failed
  → Text extraction: pymupdf / python-docx (text-based only — scanned PDFs rejected)
  → Original file discarded after text extraction
  → LLM call (Claude Sonnet) with strict JSON schema prompt
  → Pydantic validation → retry up to 2x on failure
  → { resume_json } returned to client → stored in React state
```


### JD-Based Tailoring
```
JD input (paste or HTTPS URL)
  → URL: DNS resolve → IP allowlist check (SSRF protection) → fetch
  → LLM JD analysis (inline)
  → Resume JSON + JD JSON → jd_tailor tool
  → Diff + proposed_resume_json returned to client (sync response)
  → "Accept Changes" → proposed_resume_json pushed to in-memory version stack
  → "Discard" → no state change
```


### Prompt-Based Edit
```
User selects section (dropdown) + action type + types instruction
  → Tool invoked directly (no LLM intent classification)
  → Updated JSON fragment returned in sync response
  → Diff shown inline → user accepts → pushed to in-memory version stack → PDF available for download
```


### PDF Generation
```
Confirmed resume JSON
  → JSON-to-LaTeX formatter (escapes all reserved chars: \ & % $ # _ { } ^ ~)
  → Jinja2 fills template placeholders
  → Tectonic compiles in isolated temp dir
  → Success: PDF bytes streamed directly as file download response
  → Failure: error logged, user-facing error returned; user can retry download
```


---


## 5. Agent Tools


In MVP, the API routes directly to each tool based on explicit `section` and `action` parameters supplied by the frontend. No LLM-based intent classification is used in MVP.


| Tool | Trigger | Input | Output |
|---|---|---|---|
| `jd_tailor` | "Tailor for this JD" | resume JSON + JD JSON | full updated resume JSON |
| `section_rewriter` | "Rewrite my summary / skills / etc." | section JSON + instruction | updated section JSON |
| `entry_builder` | "Add a new experience / project" | freeform prompt | structured entry JSON |
| `bullet_editor` | "Edit this specific bullet" | bullet + instruction | revised bullet string |
| `entry_remover` | "Remove this role / project" | section + identifier | updated section JSON |
| `rag_retriever` | Phase 4 only | JD JSON + embeddings | top-k candidate entries |


Every tool outputs a JSON fragment merged back into the main resume state. The LLM **never outputs LaTeX**.


---


## 6. JD Structured Output Schema


```json
{
  "role_title": "string",
  "must_have_skills": ["string"],
  "nice_to_have_skills": ["string"],
  "keywords": ["string"],
  "seniority": "junior | mid | senior | lead | executive",
  "tone": "technical | managerial | hybrid",
  "responsibilities": ["string"]
}
```


---


## 7. Version History Rules


- Every accepted edit pushes a new **immutable** entry onto the in-memory version stack — the previous entry is never overwritten.
- Each version entry stores: `resume_json`, `label`, `timestamp` (ISO-8601).
- Version history is session-scoped — it is lost when the browser tab is closed.
- Restoring a prior version pushes it as a new entry on the stack — intermediate entries are never deleted.
- No multi-resume support in MVP. Persistence and server-side version storage added in Phase 2.


---


## 8. Security Constraints


| Concern | Rule |
|---|---|
| Transport | HTTPS only on all API traffic |
| Auth | None in MVP — all endpoints are open; introduced in Phase 2 |
| SSRF | JD URL fetch: HTTPS only, block RFC 1918 / loopback / `169.254.x.x`, DNS-resolve then IP-validate |
| LaTeX injection | Escape `\ & % $ # _ { } ^ ~` in all user strings before template injection |
| SQL | All user input parameterized; no string concatenation in queries |
| Rate limiting | Deferred to post-MVP |
| File upload | Reject > 5MB, password-protected PDFs, corrupted files before extraction |


---


## 9. Non-Functional Targets


| Requirement | Target |
|---|---|
| Resume parse latency | ≤ 15 seconds (2-page resume) |
| PDF generation | ≤ 10 seconds |
| End-to-end tailoring | ≤ 30 seconds |
| Prompt-based edit | ≤ 20 seconds |
| Uptime | 99.5% monthly |
| LLM retry policy | Up to 3 attempts, exponential backoff |
| OCR | Not supported in MVP — text-based PDFs only |
| Raw file retention | Not retained — original file discarded after text extraction |
| Structured data retention | Session-scoped (in-browser) in MVP; persistent storage in Phase 2 |
| GDPR deletion | N/A in MVP — no server-side user data stored |


---


## 10. Key Design Rules (Non-Negotiable)


1. **The LLM only outputs JSON.** Never LaTeX, HTML, or code.
2. **The LaTeX template is read-only at runtime.** Blocked at infrastructure level. Only placeholders are filled.
3. **Every edit is versioned.** No destructive writes.
4. **Raw text is always stored.** Enables re-parse without re-upload.
5. **Factual grounding only.** LLM prompts explicitly forbid fabricating experience.
6. **Fail loudly.** Validation failures after retries surface to the user. No silent partial saves.
7. **All user input is untrusted.** Sanitize at every boundary: SQL, subprocess, LaTeX.
8. **URL fetching is SSRF-sandboxed.** Validate resolved IP before connecting.


---


## 11. Resolved Architecture Decisions


| Decision | Resolution |
|---|---|
| Auth | None in MVP. Anonymous access. Email/password + JWT introduced in Phase 2. |
| Multi-resume | N/A in MVP — no user accounts. Single-resume per session. Multi-resume in Phase 2+. |
| JD URL fetching | Supported with SSRF protection (FR-10). Fetch failure → user prompted to paste. |
| Prompt UX | Explicit section selector (dropdown) + action type + instruction field. No intent classification in MVP. |
| LaTeX template | One fixed single-column template in v1. Multi-template deferred to v2. |
| Diff review | Shown inline after tailoring/editing (sync response). "Accept Changes" persists; "Discard" creates no record. |
| OCR | Not supported in MVP. Scanned PDFs rejected with message to upload text-based PDF. |


---


## 12. Out of Scope (MVP)


- Non-English resumes
- LinkedIn import
- ATS score simulation
- Real-time collaborative editing
- User-defined LaTeX templates
- Mobile-native app
- Job application tracking / CRM
- User accounts and authentication (all auth deferred to Phase 2)
- Server-side data persistence (database introduced in Phase 2)
- OAuth authentication (Google/GitHub)
- Multiple resumes per user
- OCR for scanned PDFs
- In-browser PDF preview (PNG thumbnail generation)
- SSE / real-time progress streaming
- Per-user LLM rate limiting
- Version history restore UI
- AI-based intent classification (free-text command bar)