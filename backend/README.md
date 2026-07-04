# Backend

FastAPI service for the Resume Optimiser MVP.

## Local development

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/healthz`

Parse resume: `POST http://localhost:8000/api/v1/parse` (multipart `file` field)

Set `GROQ_API_KEY` in `.env` for live LLM parsing.
