import json
from typing import Any

from app.models.domain.resume import ProjectEntry, ResumeSchema, WorkExperienceEntry
from app.services.llm.client import LLMClient
from app.services.tailoring.prompts import NO_FABRICATION_RULE
from app.services.tailoring.tools.base import BaseTool

SYSTEM_PROMPT_WORK = f"""You convert freeform instructions into structured work experience entries.
Return ONLY valid JSON for one work experience entry object.
{NO_FABRICATION_RULE}
Only include facts stated in the instruction.
"""

SYSTEM_PROMPT_PROJECT = f"""You convert freeform instructions into structured project entries.
Return ONLY valid JSON for one project entry object.
{NO_FABRICATION_RULE}
Only include facts stated in the instruction.
"""


class EntryBuilder(BaseTool):
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def invoke(
        self,
        resume: ResumeSchema,
        section: str,
        params: dict[str, Any],
    ) -> Any:
        instruction = params.get("instruction", "")

        if section == "work_experience":
            system_prompt = SYSTEM_PROMPT_WORK
            validator = WorkExperienceEntry.model_validate
        elif section == "projects":
            system_prompt = SYSTEM_PROMPT_PROJECT
            validator = ProjectEntry.model_validate
        else:
            raise ValueError(f"EntryBuilder does not support section '{section}'.")

        user_prompt = (
            "Convert the instruction into a structured entry.\n\n"
            f"INSTRUCTION:\n{instruction}\n\n"
            f"TARGET SECTION: {section}"
        )

        entry = await self._llm_client.call(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            validate=validator,
        )
        return entry.model_dump()
