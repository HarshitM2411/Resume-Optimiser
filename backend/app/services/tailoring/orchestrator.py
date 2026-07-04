from fastapi import HTTPException

from app.models.domain.diff import PendingEditResponse
from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema
from app.services.tailoring.diff_utils import compute_diff, merge_fragment
from app.services.tailoring.tools.base import BaseTool
from app.services.tailoring.tools.entry_builder import EntryBuilder
from app.services.tailoring.tools.entry_remover import EntryRemover
from app.services.tailoring.tools.jd_tailor import JDTailor
from app.services.tailoring.tools.section_rewriter import SectionRewriter

TOOL_REGISTRY: dict[tuple[str, str], type[BaseTool]] = {
    ("summary", "rewrite"): SectionRewriter,
    ("work_experience", "rewrite"): SectionRewriter,
    ("work_experience", "add"): EntryBuilder,
    ("work_experience", "remove"): EntryRemover,
    ("skills", "rewrite"): SectionRewriter,
    ("education", "rewrite"): SectionRewriter,
    ("projects", "rewrite"): SectionRewriter,
    ("projects", "add"): EntryBuilder,
    ("projects", "remove"): EntryRemover,
}


class Orchestrator:
    async def orchestrate(
        self,
        resume: ResumeSchema,
        section: str,
        action: str,
        instruction: str,
        **extra_params: object,
    ) -> PendingEditResponse:
        key = (section, action)
        if key not in TOOL_REGISTRY:
            raise HTTPException(
                status_code=422,
                detail="Unsupported section/action combination.",
            )

        tool_cls = TOOL_REGISTRY[key]
        params = {"instruction": instruction, **extra_params}
        updated_fragment = await tool_cls().invoke(
            resume=resume,
            section=section,
            params=params,
        )

        updated_resume = merge_fragment(resume, section, action, updated_fragment)
        diff = compute_diff(resume, updated_resume)

        return PendingEditResponse(
            proposed_resume_json=updated_resume,
            diff=diff,
        )

    async def tailor_for_jd(
        self,
        resume: ResumeSchema,
        jd: JDAnalysisSchema,
    ) -> PendingEditResponse:
        proposed_resume = await JDTailor().tailor(resume, jd)
        diff = compute_diff(resume, proposed_resume)
        return PendingEditResponse(
            proposed_resume_json=proposed_resume,
            diff=diff,
        )
