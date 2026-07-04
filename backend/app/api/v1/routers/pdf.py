import io

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.exceptions import TemplateValidationError
from app.core.operation_log import log_operation
from app.models.domain.resume import ResumeSchema
from app.models.domain.template import TemplateFormData, TemplatePdfRequest, TemplateSchema
from app.services.rendering.latex_formatter import render_resume_latex
from app.services.rendering.pdf_compiler import compile_pdf
from app.services.rendering.template_formatter import (
    render_template_latex,
    validate_required_fields,
)

router = APIRouter(tags=["pdf"])


class PdfRequest(BaseModel):
    resume_json: ResumeSchema | None = None
    form_data: TemplateFormData | None = None
    template_schema: TemplateSchema | None = None


@router.post("/pdf")
async def generate_pdf(request: PdfRequest) -> StreamingResponse:
    if request.form_data is not None:
        if request.template_schema is None:
            raise TemplateValidationError(
                "template_schema is required when submitting form_data."
            )

        missing = validate_required_fields(request.form_data, request.template_schema)
        if missing:
            raise TemplateValidationError(
                "Complete all required fields before downloading: "
                + ", ".join(missing)
            )

        async with log_operation(service="rendering", operation="render_template_latex"):
            latex_source = render_template_latex(
                request.form_data,
                request.template_schema,
            )
        filename = "formatted-resume.pdf"
    elif request.resume_json is not None:
        async with log_operation(service="rendering", operation="render_latex"):
            latex_source = render_resume_latex(request.resume_json)
        filename = "resume.pdf"
    else:
        raise TemplateValidationError(
            "Provide either resume_json or form_data in the request body."
        )

    async with log_operation(service="rendering", operation="compile_pdf"):
        pdf_bytes = await compile_pdf(latex_source)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
