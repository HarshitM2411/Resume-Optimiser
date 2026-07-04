from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.operation_log import log_operation
from app.models.domain.diff import PendingEditResponse
from app.models.domain.resume import ResumeSchema
from app.services.tailoring.orchestrator import Orchestrator

router = APIRouter(tags=["edit"])


class EditRequest(BaseModel):
    resume_json: ResumeSchema
    section: str
    action: str
    instruction: str = Field(min_length=1)
    index: int | None = None
    identifier: str | None = None
    entry_index: int | None = None
    bullet_index: int | None = None


@router.post("/edit", response_model=PendingEditResponse)
async def edit_resume(request: EditRequest) -> PendingEditResponse:
    extra_params: dict[str, object] = {}
    if request.index is not None:
        extra_params["index"] = request.index
    if request.identifier is not None:
        extra_params["identifier"] = request.identifier
    if request.entry_index is not None:
        extra_params["entry_index"] = request.entry_index
    if request.bullet_index is not None:
        extra_params["bullet_index"] = request.bullet_index

    async with log_operation(
        service="tailoring",
        operation=f"edit_{request.section}_{request.action}",
    ):
        orchestrator = Orchestrator()
        return await orchestrator.orchestrate(
            resume=request.resume_json,
            section=request.section,
            action=request.action,
            instruction=request.instruction,
            **extra_params,
        )
