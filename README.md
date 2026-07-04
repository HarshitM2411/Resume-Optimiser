# Resume Optimiser

AI-powered resume customization MVP (Phase 1). Upload a resume, tailor it to a job description, apply prompt-based edits, and download a polished PDF.

## Prerequisites

- Docker Desktop
- OpenSSL (for local HTTPS certs used by nginx)
- Node.js 22+ (optional, for local frontend dev)
- Python 3.12+ (optional, for local backend dev)

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | — | Groq API key for LLM calls |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model name |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed browser origins |
| `ALLOWED_HOSTS` | No | `localhost,127.0.0.1,backend` | Trusted `Host` header values |
| `ENVIRONMENT` | No | `development` | Set to `production` to enable HTTPS redirect middleware |
| `BACKEND_URL` | No | `http://localhost:8000` | Frontend rewrite target (Docker internal URL) |
| `RUN_E2E` | No | — | Set to `1` to run docker stack e2e tests |
| `E2E_BASE_URL` | No | `http://localhost:8000` | Base URL for e2e tests |

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

## Quick start with Docker

1. Generate self-signed HTTPS certificates for nginx:

```bash
# Linux / macOS / Git Bash
bash infra/scripts/generate-dev-certs.sh

# Windows PowerShell
powershell -File infra/scripts/generate-dev-certs.ps1
```

2. Start all services:

```bash
docker compose -f infra/docker-compose.yml up --build
```

3. Verify health:

```bash
curl http://localhost:8000/healthz
curl -k https://localhost/healthz
```

4. Open the app:

| URL | Purpose |
|---|---|
| http://localhost:3000 | Frontend (direct) |
| http://localhost:8000/docs | API docs (direct) |
| https://localhost | Frontend + API via nginx (self-signed cert) |

5. Run the Tectonic smoke test:

```bash
bash infra/scripts/tectonic-smoke-test.sh
# or
powershell -File infra/scripts/tectonic-smoke-test.ps1
```

## Local development (without Docker)

### Backend

```bash
cd backend
pip install -e ".[dev]"
set GROQ_API_KEY=your-key-here   # PowerShell: $env:GROQ_API_KEY="..."
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api/v1/*` to the backend via `next.config.ts`.

## Testing

### Unit and integration tests

```bash
cd backend
pytest
```

### Full API flow test (mocked LLM/PDF)

Included in `pytest` as `tests/integration/test_full_flow.py`:

`parse → tailor → edit → pdf`

### Docker stack e2e (optional)

With docker compose running:

```bash
cd backend
set RUN_E2E=1
pytest -m e2e
```

## Manual test journey

1. Open http://localhost:3000
2. Upload a PDF/DOCX/TXT resume
3. Paste a job description and click **Tailor**
4. Review the diff and **Accept Changes**
5. Select a section, enter an instruction, click **Apply**
6. Review and **Accept Changes**
7. Click **Download PDF**

## Project structure

```
backend/     FastAPI API, ingestion, LLM, tailoring, PDF rendering
frontend/    Next.js app
infra/       Docker Compose, nginx, scripts
docs/        Architecture and implementation plans
```

## Phase 1 scope

- Anonymous, stateless MVP
- No database or authentication
- Resume JSON stored in browser memory only
- Groq LLM (`llama-3.3-70b-versatile`)
- Tectonic PDF compilation

## Troubleshooting

- **PDF generation fails in Docker**: ensure the backend image built successfully with Tectonic included; check backend logs for `tectonic_compilation_failed`.
- **HTTPS warnings in browser**: expected with self-signed dev certs; proceed for local testing or trust the generated cert.
- **LLM errors**: verify `GROQ_API_KEY` is set in `.env` and passed to the backend container.
- **CORS errors via nginx**: ensure `CORS_ORIGINS` includes `https://localhost` when using the nginx HTTPS entrypoint.
