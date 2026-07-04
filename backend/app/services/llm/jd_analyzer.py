from app.models.domain.jd import JDAnalysisSchema
from app.services.llm.client import LLMClient

SYSTEM_PROMPT = """You are a job description analysis assistant.
Extract structured fields from the provided job description text.

Rules:
- Return ONLY valid JSON. No markdown, commentary, or code fences.
- Match the schema exactly.
- Use empty arrays when a list field has no items.
- Infer seniority and tone from context when possible; choose the closest allowed value.
- Extract concrete skills and keywords mentioned in the posting.

Schema:
{
  "role_title": "string",
  "must_have_skills": ["string"],
  "nice_to_have_skills": ["string"],
  "keywords": ["string"],
  "seniority": "junior | mid | senior | lead | executive",
  "tone": "technical | managerial | hybrid",
  "responsibilities": ["string"]
}
"""


class JDAnalyzer:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def analyze(self, raw_text: str) -> JDAnalysisSchema:
        user_prompt = (
            "Analyze the following job description and return the required JSON schema.\n\n"
            f"JOB DESCRIPTION:\n{raw_text}"
        )
        return await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validate=JDAnalysisSchema.model_validate,
        )
