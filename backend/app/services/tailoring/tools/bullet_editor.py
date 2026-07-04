from typing import Any

from app.models.domain.resume import ResumeSchema
from app.services.llm.client import LLMClient
from app.services.tailoring.prompts import NO_FABRICATION_RULE
from app.services.tailoring.tools.base import BaseTool

SYSTEM_PROMPT = f"""You rewrite a single resume bullet point.
Return ONLY valid JSON as: {{"bullet": "<rewritten bullet>"}}
{NO_FABRICATION_RULE}
"""


class BulletEditor(BaseTool):
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def invoke(
        self,
        resume: ResumeSchema,
        section: str,
        params: dict[str, Any],
    ) -> Any:
        instruction = params.get("instruction", "")
        entry_index = params.get("entry_index")
        bullet_index = params.get("bullet_index")

        if section != "work_experience":
            raise ValueError("BulletEditor only supports work_experience.")
        if entry_index is None or bullet_index is None:
            raise ValueError("BulletEditor requires entry_index and bullet_index.")

        entries = resume.work_experience
        if entry_index < 0 or entry_index >= len(entries):
            raise ValueError("entry_index is out of range.")

        bullets = entries[entry_index].bullets
        if bullet_index < 0 or bullet_index >= len(bullets):
            raise ValueError("bullet_index is out of range.")

        current_bullet = bullets[bullet_index]
        user_prompt = (
            "Rewrite this bullet using the instruction.\n\n"
            f"INSTRUCTION:\n{instruction}\n\n"
            f"CURRENT BULLET:\n{current_bullet}"
        )

        result = await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        return result.get("bullet", result)
