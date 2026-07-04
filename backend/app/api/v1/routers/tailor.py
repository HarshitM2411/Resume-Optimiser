from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator

from app.core.operation_log import log_operation
from app.models.domain.diff import PendingEditResponse
from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema
from app.services.llm.jd_analyzer import JDAnalyzer
from app.services.storage.url_fetcher import fetch_jd_url
from app.services.tailoring.orchestrator import Orchestrator

router = APIRouter(tags=["tailor"])


class JdSourceRequest(BaseModel):
    jd_text: str | None = None
    jd_url: str | None = None

    @model_validator(mode="after")
    def validate_jd_source(self) -> "JdSourceRequest":
        if not self.jd_text and not self.jd_url:
            raise ValueError("One of jd_text or jd_url is required.")
        return self


class TailorRequest(JdSourceRequest):
    resume_json: ResumeSchema


async def _resolve_jd_text(jd_text: str | None, jd_url: str | None) -> str:
    resolved = jd_text
    if jd_url:
        async with log_operation(service="storage", operation="fetch_jd_url"):
            resolved = await fetch_jd_url(jd_url)

    if not resolved:
        raise HTTPException(status_code=422, detail="Job description text is required.")

    return resolved


async def _analyze_jd_text(jd_text: str) -> JDAnalysisSchema:
    async with log_operation(service="llm", operation="analyze_jd"):
        return await JDAnalyzer().analyze(jd_text)


@router.post("/analyze-jd", response_model=JDAnalysisSchema)
async def analyze_jd(request: JdSourceRequest) -> JDAnalysisSchema:
    jd_text = await _resolve_jd_text(request.jd_text, request.jd_url)
    return await _analyze_jd_text(jd_text)


@router.post("/tailor", response_model=PendingEditResponse)
async def tailor_resume(request: TailorRequest) -> PendingEditResponse:
    jd_text = await _resolve_jd_text(request.jd_text, request.jd_url)
    jd_analysis = await _analyze_jd_text(jd_text)

    async with log_operation(service="tailoring", operation="tailor_for_jd"):
        orchestrator = Orchestrator()
        return await orchestrator.tailor_for_jd(request.resume_json, jd_analysis)
