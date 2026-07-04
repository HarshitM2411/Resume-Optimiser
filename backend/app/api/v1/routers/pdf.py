import io

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.operation_log import log_operation
from app.models.domain.resume import ResumeSchema
from app.services.rendering.latex_formatter import render_resume_latex
from app.services.rendering.pdf_compiler import compile_pdf

router = APIRouter(tags=["pdf"])


class PdfRequest(BaseModel):
    resume_json: ResumeSchema


@router.post("/pdf")
async def generate_pdf(request: PdfRequest) -> StreamingResponse:
    async with log_operation(service="rendering", operation="render_latex"):
        latex_source = render_resume_latex(request.resume_json)

    async with log_operation(service="rendering", operation="compile_pdf"):
        pdf_bytes = await compile_pdf(latex_source)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="resume.pdf"'},
    )
