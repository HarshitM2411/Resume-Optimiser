# Problem Statement: AI-Powered Resume Customization System


## 1. Overview


Candidates applying to multiple roles face a recurring, time-intensive problem: every job description demands a slightly different version of their resume. Manually rewriting bullet points, reordering skills, and adjusting the summary for each application takes significant time and requires a level of self-marketing skill that many candidates lack. Most people submit the same generic resume to every role and lose opportunities as a result.


This project aims to eliminate that friction by building an AI-powered resume customization system. The system takes a candidate's base resume, analyzes a target job description, and produces a tailored version of the resume that is better aligned to the role — all while preserving a fixed, professional LaTeX template. The candidate can also make direct edits to any section using natural-language prompts.


---


## 2. Problem Context


### 2.1 The Core Pain Points


- **Time cost**: Tailoring a resume for a single role takes 30–90 minutes manually. Candidates applying to 10+ roles face an unsustainable editing burden.
- **Skill gap**: Many candidates do not know how to identify which experiences to emphasize for a given role, which keywords matter, or how to reframe their achievements to match the job's language.
- **Consistency loss**: Manual edits across many resume versions introduce formatting drift, typos, and structural inconsistencies.
- **ATS invisibility**: Resumes that do not mirror the keywords and phrasing of a job description are often filtered out by Applicant Tracking Systems before a human ever reads them.


### 2.2 What the System Must Solve


1. Accept a candidate's existing resume in any common format (PDF, DOCX, plain text).
2. Parse that resume into a structured, section-level representation that the system can reason about and edit.
3. Accept a job description as input and extract the role's requirements, must-have skills, preferred keywords, and seniority signals.
4. Compare the resume against the job description and identify gaps, mismatches, and opportunities to better align content.
5. Generate a revised resume that addresses those gaps — rewriting bullet points, rephrasing the summary, reordering or emphasizing skills — while staying factually grounded in the candidate's actual experience.
6. Allow the candidate to make additional edits through natural-language prompts without touching the template or layout.
7. Render the final resume through a fixed LaTeX template and export it as a downloadable PDF.


---


## 3. Product Goal


Build a web-based application where a user can:


1. Upload or paste their existing resume once.
2. Provide a job description (paste text, or provide a URL).
3. Receive an AI-tailored version of their resume optimized for that specific role.
4. Further refine the resume using plain-English instructions.
5. Download the final result as a professionally formatted PDF, always rendered from the same fixed LaTeX template.


The system is not a resume builder from scratch. It is a resume optimizer and editor that works on top of an existing candidate profile.


---


## 4. Functional Requirements


### 4.1 Resume Ingestion and Parsing


- **FR-01**: The system must accept resume uploads in PDF, DOCX, and plain text (.txt) formats.
- **FR-02**: File size must be validated on upload; files larger than 5MB must be rejected with a clear error message.
- **FR-03**: Text must be extracted from PDF files using layout-aware extraction (pymupdf). If the PDF contains no text layer (scanned document), the system must reject it immediately with the message: "This PDF appears to be a scanned image. Please upload a text-based PDF." Password-protected or corrupted PDFs that cannot be opened must also be rejected before any extraction is attempted. OCR support is deferred to post-MVP.
- **FR-04**: Text must be extracted from DOCX files including content inside tables, as many resume templates use invisible tables for layout.
- **FR-05**: Extracted raw text is not persisted. The original file is discarded after the parse response is returned. Re-uploading is required if parsing must be repeated.
- **FR-06**: The extracted text must be passed to an LLM (Claude Sonnet) with a strict JSON schema prompt to produce a structured resume object.
- **FR-07**: The structured output must be validated against a Pydantic schema before storage. If validation fails, the system must retry the LLM call with the validation error appended, up to two retries.
- **FR-08**: The structured resume JSON is returned to the client and held in browser memory (React state). No server-side storage in MVP.


### 4.2 Resume Data Model (Structured Schema)


The parsed resume must be stored and manipulated as a structured JSON object with the following top-level sections. All sections are optional (nullable or empty array) to accommodate resumes that omit them:


```
{
  "contact": {
    "name": string,
    "email": string,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "github": string | null,
    "website": string | null
  },
  "summary": string | null,
  "work_experience": [
    {
      "company": string,
      "title": string,
      "duration": string,
      "location": string | null,
      "bullets": [string]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "field": string | null,
      "graduation_year": string | null
    }
  ],
  "skills": {
    "languages": [string],
    "frameworks": [string],
    "tools": [string],
    "other": [string]
  },
  "projects": [
    {
      "name": string,
      "description": string,
      "tech_stack": [string],
      "url": string | null
    }
  ],
  "achievements": [string],
  "certifications": [string]
}
```


- **FR-09**: Every accepted edit pushes a new immutable entry onto an in-memory version stack in the browser. The previous entry is never overwritten. Version history is session-scoped and is lost when the tab is closed. Server-side version persistence is deferred to Phase 2.


### 4.3 Job Description Analysis


- **FR-10**: The system must accept job description input as pasted text or as a URL (the system will fetch and extract the page text). URL fetching must implement SSRF protection: only HTTPS URLs are permitted; requests to private IP ranges (RFC 1918), loopback addresses, and cloud metadata endpoints (e.g. `169.254.169.254`) must be blocked before any connection is made. The hostname must be DNS-resolved and the resulting IP validated against a public address allowlist before the connection is established. If a fetch fails (blocked, 403, timeout), the system must instruct the user to paste the JD text directly.
- **FR-11**: The JD must be passed to the LLM for structured extraction, producing:
  - `role_title` (string)
  - `must_have_skills` (array of strings)
  - `nice_to_have_skills` (array of strings)
  - `keywords` (array of strings — terms that appear frequently or prominently)
  - `seniority` ("junior" | "mid" | "senior" | "lead" | "executive")
  - `tone` ("technical" | "managerial" | "hybrid")
  - `responsibilities` (array of strings — key duties described in the JD)
- **FR-12**: The JD analysis result is used immediately for the tailoring step and returned to the client as part of the sync response. It does not need to be persisted as a separate session record in MVP.


### 4.4 Resume-to-JD Matching and Tailoring


- **FR-13**: When the user requests JD-based tailoring, the system must compare the structured resume against the structured JD analysis and identify: missing skills, underrepresented keywords, bullet points that could be reframed to match the role's language, and sections that are irrelevant or low-signal for the target role.
- **FR-14**: The tailoring step must rewrite bullet points to surface relevant achievements and align with JD keywords, without fabricating experience. The LLM prompt must explicitly instruct the model to stay factually grounded in the candidate's existing bullets.
- **FR-15**: The tailoring step must rewrite the summary section (if present) to reflect the target role's title, tone, and emphasis areas.
- **FR-16**: The tailoring step must reorganize the skills section to lead with skills explicitly mentioned in the JD.
- **FR-17**: The tailoring output must be a complete updated resume JSON (same schema), not a diff. The diff view is a UI concern handled separately.
- **FR-18**: The user must be shown a before/after diff view of what changed (section by section) before the new version is committed.


### 4.5 Prompt-Based Section Editing


The system must support direct natural-language editing of any resume section. The following prompt types must be handled:


- **FR-19 — Add entry**: `"Add a new work experience: Company: XYZ Corp, Duration: 2024–2025, Title: Backend Engineer, Bullet 1: Built..., Bullet 2: Improved..."` → The system parses this into a structured `work_experience` entry and appends it to the array.
- **FR-20 — Rewrite section**: `"Rewrite my summary for a backend engineering role at a fintech company."` → The system rewrites only the `summary` field using the LLM and returns the updated field.
- **FR-21 — Update skills**: `"Update my skills section to emphasize Python, SQL, and machine learning."` → The system reorders and augments the skills JSON to lead with the specified skills.
- **FR-22 — Remove entry**: `"Remove the internship at Company ABC from my work experience."` → The system identifies the matching entry by company name and removes it.
- **FR-23 — Edit bullet**: `"Rewrite the third bullet point under my role at Company XYZ to sound more results-oriented."` → The system identifies the specific bullet and rewrites it in isolation.
- **FR-24 — General tailoring**: `"Tailor my resume for this job description: [JD text]"` → Triggers the full JD tailoring pipeline (FR-13 through FR-17).
- **FR-25**: The frontend must provide an explicit section selector (dropdown) and action type selector for all prompt-based edits. The API receives `section`, `action`, and `instruction` as structured parameters — no LLM-based intent classification is required in MVP. The LLM is invoked only to execute the edit, not to classify it. Intent classification via free-text command bar is deferred to post-MVP.
- **FR-26**: Every prompt-based edit must produce a new version in the version history.


### 4.6 LaTeX Rendering and PDF Generation


- **FR-27**: The system must maintain a fixed LaTeX template (`.tex` file) whose layout, fonts, margins, and styling are never modified by the AI system. Only the content placeholders are filled dynamically.
- **FR-28**: The LaTeX template must use Jinja2-style placeholders (e.g. `{{ summary }}`, `{{ work_experience }}`) for each section. A deterministic Python formatter converts the resume JSON into valid LaTeX fragment strings for each section before injection.
- **FR-29**: The LLM must never output LaTeX directly. All LaTeX generation is handled by deterministic code that consumes the resume JSON.
- **FR-29a**: The JSON-to-LaTeX formatter must escape all LaTeX-reserved characters (`\`, `&`, `%`, `$`, `#`, `_`, `{`, `}`, `^`, `~`) in every user-supplied string field before injection into the template. Unescaped reserved characters that reach the compiler must be treated as a critical rendering bug.
- **FR-30**: PDF compilation must use `tectonic` (preferred) or `pdflatex` invoked as a subprocess. Compilation must run in an isolated temporary directory per request.
- **FR-30a**: If LaTeX compilation fails, the compiler error output must be logged server-side and a clear user-facing error returned. The user may retry by clicking "Download PDF" again.
- **FR-31**: The compiled PDF must be streamed directly to the client as a file download response. No persistent PDF storage is required in MVP.
- **FR-32**: *(Deferred to post-MVP)* — In-browser PDF preview via PNG thumbnail. In MVP the user downloads the PDF to view it.
- **FR-33**: A "Download PDF" button must be available after every confirmed edit. PDF compilation is triggered on demand at download time.


### 4.7 Version History


- **FR-34**: Every state of the resume (after parse, after each edit, after each tailoring) must be stored as an immutable version record with a timestamp and a human-readable label (e.g. "Tailored for: Senior Backend Engineer at Stripe", "Edited: Added XYZ work experience").
- **FR-35**: The user must be able to view a list of all versions, preview any version, and restore any prior version as the current working state.
- **FR-36**: Restoring a prior version must create a new version record (the restore), not delete intermediate versions.


### 4.8 RAG-Based Experience Retrieval (Phase 4 — optional enhancement)


- **FR-36a**: Users must be able to populate the experience bank via two mechanisms: (a) promoting an existing entry from any prior resume version into the bank, or (b) submitting a natural-language description of an experience that the system parses into the appropriate structured format and stores pending user confirmation.
- **FR-37**: If the user maintains an extended experience bank (all past roles, projects, and achievements, including those not currently on the resume), the system must embed all entries using a text embedding model and store them in a vector index (pgvector or Chroma).
- **FR-38**: During JD tailoring, the system must retrieve the top-k most semantically relevant entries from the experience bank and present them as candidates for inclusion in the tailored resume.
- **FR-39**: The user must explicitly approve which retrieved entries are added to the resume; the system must not auto-insert from the experience bank.


---


## 5. Non-Functional Requirements


- **NFR-01 — Latency**: The LLM parsing step must complete within 15 seconds for a standard 2-page resume. PDF generation must complete within 10 seconds. Long-running steps must display a loading state to the user. SSE progress streaming is deferred to post-MVP.
- **NFR-02 — Accuracy**: The parsed resume JSON must capture all visible sections without omission. The system must be tested against a corpus of at least 20 diverse resume formats before launch.
- **NFR-03 — Template integrity**: The LaTeX template file must be read-only at runtime. Any attempt to modify it must be blocked at the infrastructure level.
- **NFR-04 — Data isolation**: N/A in MVP — there are no user accounts and no server-side data storage. Introduced in Phase 2.
- **NFR-05 — Reliability**: LLM calls must implement retry logic (up to 3 attempts with exponential backoff) and must surface a clear error to the user if all retries fail.
- **NFR-06 — Storage**: N/A in MVP — no files or structured data are persisted server-side. All state is held in browser memory. Persistence introduced in Phase 2.
- **NFR-07 — Security**: All API traffic must be served over HTTPS. There is no authentication in MVP — all endpoints are open. All user-supplied text must be treated as untrusted input and sanitized before use in subprocess invocations and LaTeX rendering. Per-user LLM rate limiting is deferred to post-MVP.
- **NFR-08 — Availability**: The backend must be stateless to allow horizontal scaling when needed. High-availability multi-instance deployment is deferred to post-MVP.
- **NFR-09 — Privacy and Compliance**: N/A in MVP — no personal data is stored server-side. GDPR self-service deletion is deferred to Phase 2 when persistence is introduced. Resume data must never be used to train or fine-tune any model without explicit user consent.
- **NFR-10 — Cost Controls**: Deferred to Phase 2. Per-user LLM token tracking requires persistent storage. No token budget enforcement in MVP.


---


## 6. System Architecture Summary


### 6.1 Technology Stack


| Layer | Technology | Rationale |
|---|---|---|
| Backend API | FastAPI (Python) | Async support, clean type hints, fast dev cycle |
| LLM | Claude Sonnet 4.6 via Anthropic API | Best structured output quality for resume extraction |
| Resume state | Browser memory (React state) | Session-scoped; persistence in Phase 2 |
| Vector store (RAG) | pgvector — Phase 4 only, not in MVP | Avoids separate infra when RAG is introduced |
| File storage | None (MVP) — PDFs streamed on demand; raw text in PostgreSQL | No object storage required in MVP |
| LaTeX compiler | Tectonic (Docker container) | Self-contained, no TeX Live installation |
| Frontend | Next.js (React) | File upload, section editor, diff view, PDF download |
| Template engine | Jinja2 | JSON → LaTeX fragment rendering |
| Validation | Pydantic v2 | LLM output schema enforcement |


### 6.2 Core Pipeline (Request Flow)


```
User uploads resume
  → File type detection + text extraction (pymupdf / python-docx — text-based only; scanned PDFs rejected)
  → Raw text cleaning (whitespace, encoding)
  → LLM extraction → Pydantic validation → return { resume_json } to client


User provides job description
  → JD text extraction (paste or URL fetch)
  → LLM JD analysis → structured JD object stored


User requests tailoring
  → Resume JSON + JD JSON → Orchestrator
  → JD Tailor tool → updated resume JSON
  → Diff computed → user reviews diff
  → User confirms → new version stored → PDF compiled → preview returned


User selects section + action type + types instruction
  → Appropriate editing tool invoked directly (no intent classification)
  → Updated resume JSON + diff returned → user confirms
  → New version stored → PDF available for download
```


### 6.3 Agent Architecture


The orchestrator is a **router + tool pattern** (not LangGraph in Phase 1). It classifies the user's intent and calls one of the following tools:


| Tool | Trigger | Input | Output |
|---|---|---|---|
| `jd_tailor` | "Tailor for this JD" | resume JSON + JD JSON | updated resume JSON |
| `section_rewriter` | "Rewrite my summary / skills / etc." | section JSON + instruction | updated section JSON |
| `entry_builder` | "Add a new experience / project" | freeform prompt | structured entry JSON |
| `bullet_editor` | "Edit this specific bullet" | bullet string + instruction | revised bullet string |
| `entry_remover` | "Remove this role / project" | section + identifier | updated section JSON |
| `rag_retriever` | Phase 4 only | JD JSON + embeddings | top-k candidate entries |


The LLM is called inside each tool. The tool's output is always a JSON fragment that is merged back into the main resume state.


---


## 7. Key Design Principles


1. **The LLM only outputs JSON.** It never writes LaTeX, HTML, or code. All presentation rendering is deterministic code that consumes JSON.
2. **The LaTeX template is immutable at runtime.** The AI system only fills placeholders; it never restructures or restyls the template.
3. **Every edit is versioned.** No edit is destructive. The user can always go back.
4. **Raw text is always stored.** The original extracted text is retained so the resume can be re-parsed if the schema changes, without requiring re-upload.
5. **Factual grounding is enforced at the prompt level.** Every tailoring prompt explicitly instructs the LLM not to fabricate experience — only to reframe, reorder, or rephrase what already exists.
6. **Fail loudly on validation.** If the LLM output does not pass Pydantic validation after retries, the error surfaces to the user with a clear message. Silent partial saves are not permitted.
7. **All user input is untrusted.** Text from uploaded files, pasted job descriptions, and natural-language prompts is treated as untrusted at every system boundary — sanitized before SQL operations, escaped before LaTeX injection, and never executed as code.
8. **URL fetching is sandboxed.** The system never makes outbound HTTP requests to user-supplied URLs without first validating the resolved IP against a public address allowlist (SSRF protection, FR-10).


---


## 8. Out of Scope (MVP)


- Multi-language resume support (non-English)
- LinkedIn profile import
- ATS score simulation
- Real-time collaborative editing
- Custom LaTeX template creation by users (the template is fixed)
- Mobile-native app (web-responsive only)
- Job application tracking or CRM features
- User accounts and authentication (all auth deferred to Phase 2)
- Server-side data persistence (database introduced in Phase 2)
- OAuth authentication (Google/GitHub)
- Multiple resumes per user
- OCR for scanned PDFs — text-based PDFs only in MVP
- In-browser PDF preview (PNG thumbnail generation via Ghostscript)
- SSE / real-time progress streaming — synchronous responses with loading state in MVP
- Per-user LLM rate limiting
- Version history restore UI — backend versions all edits but no restore UI in MVP
- AI-based intent classification — section and action selected explicitly via UI in MVP


---


## 9. Success Criteria


- A user can upload a resume and receive a fully parsed, structured JSON representation within 15 seconds.
- A user can provide a job description and receive a tailored resume PDF within 30 seconds end-to-end.
- A user can make any of the prompt-based edits described in FR-19 through FR-24 and receive an updated PDF within 20 seconds.
- All tailored content is factually grounded — no fabricated experience appears in the output.
- The LaTeX template renders identically across all tailored versions; only content changes.
- Version history correctly records every accepted edit in the in-memory stack for the duration of the session.


---


## 10. Architecture Decisions (Resolved)


The following decisions have been made to unblock implementation and are recorded here for traceability.


1. **Auth**: No authentication in MVP. All API endpoints are open. Email/password login (with JWTs) and OAuth are introduced in Phase 2.
2. **Multi-resume support**: One resume per user in MVP. Multi-resume support (up to 5 named resumes) is deferred to post-MVP.
3. **JD URL fetching**: URL-based JD input is supported with SSRF protection as specified in FR-10. If a fetch fails (blocked, 403, timeout), the system falls back to instructing the user to paste the JD text.
4. **Prompt UX**: An explicit section selector (dropdown) and action type selector are used for all prompt-based edits in MVP. No intent classification — the user picks the section and action directly. Free-text command bar is deferred to post-MVP.
5. **LaTeX template selection**: v1 ships with one fixed global single-column template. Multi-template support is deferred to v2.
6. **Diff review UX**: The diff view is shown inline after tailoring or editing (synchronous response). The user must explicitly click "Accept Changes" to persist the new version. "Discard" cancels without creating a version record.
7. **OCR**: Not supported in MVP. Scanned PDFs are rejected with a message to upload a text-based PDF.