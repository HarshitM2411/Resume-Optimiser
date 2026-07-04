from app.models.domain.resume import ResumeSchema
from app.services.llm.client import LLMClient

SYSTEM_PROMPT = """You are a resume parsing assistant.
Extract structured resume data from the provided raw text.

Rules:
- Return ONLY valid JSON. No markdown, commentary, or code fences.
- Match the schema exactly.
- Use null for unknown optional scalar fields.
- Use empty arrays for missing list sections.
- Do not invent experience, employers, degrees, or skills not supported by the source text.
- Preserve factual content; normalize formatting only.

Schema:
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
"""


class ResumeParser:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def parse(self, raw_text: str) -> ResumeSchema:
        user_prompt = (
            "Parse the following resume text into the required JSON schema.\n\n"
            f"RESUME TEXT:\n{raw_text}"
        )
        return await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validate=ResumeSchema.model_validate,
        )
