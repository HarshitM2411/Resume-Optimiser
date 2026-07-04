import json
from typing import Any

from app.models.domain.resume import ResumeSchema
from app.services.llm.client import LLMClient
from app.services.tailoring.diff_utils import get_section_value
from app.services.tailoring.prompts import NO_FABRICATION_RULE
from app.services.tailoring.tools.base import BaseTool

SYSTEM_PROMPT = f"""You rewrite one resume section at a time.
Return ONLY valid JSON containing the updated section value under the section key.
{NO_FABRICATION_RULE}
"""


class SectionRewriter(BaseTool):
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def invoke(
        self,
        resume: ResumeSchema,
        section: str,
        params: dict[str, Any],
    ) -> Any:
        instruction = params.get("instruction", "")
        current_value = get_section_value(resume, section)
        user_prompt = (
            f"Rewrite the resume section '{section}' using this instruction:\n{instruction}\n\n"
            f"CURRENT SECTION JSON:\n{json.dumps(current_value, indent=2)}\n\n"
            f'Return JSON as: {{"{section}": <updated section value>}}'
        )

        result = await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        return result.get(section, result)
