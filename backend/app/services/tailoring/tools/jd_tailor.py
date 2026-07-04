import json
from typing import Any

from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema
from app.services.llm.client import LLMClient
from app.services.tailoring.prompts import NO_FABRICATION_RULE
from app.services.tailoring.tools.base import BaseTool

SYSTEM_PROMPT = f"""You tailor resumes to job descriptions.
Return ONLY valid JSON for a complete resume object matching the required schema.
{NO_FABRICATION_RULE}
Rephrase and reorder existing content to align with the job description.
Do not remove contact information.
"""


class JDTailor(BaseTool):
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def tailor(self, resume: ResumeSchema, jd: JDAnalysisSchema) -> ResumeSchema:
        user_prompt = (
            "Tailor the resume JSON to the job description JSON.\n\n"
            f"RESUME JSON:\n{json.dumps(resume.model_dump(), indent=2)}\n\n"
            f"JOB DESCRIPTION JSON:\n{json.dumps(jd.model_dump(), indent=2)}"
        )
        return await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validate=ResumeSchema.model_validate,
        )

    async def invoke(
        self,
        resume: ResumeSchema,
        section: str,
        params: dict[str, Any],
    ) -> Any:
        jd = params.get("jd")
        if not isinstance(jd, JDAnalysisSchema):
            raise ValueError("jd_tailor requires a JDAnalysisSchema in params.")
        tailored = await self.tailor(resume, jd)
        return tailored.model_dump()
