from fastapi import APIRouter, File, UploadFile

from app.core.operation_log import log_operation
from app.models.domain.template import FormatResponse
from app.services.ingestion.ingestion_service import IngestionService
from app.services.llm.resume_parser import ResumeParser
from app.services.llm.template_extractor import TemplateExtractor
from app.services.template.content_mapper import TemplateContentMapper

router = APIRouter(tags=["format"])


@router.post("/format", response_model=FormatResponse)
async def format_resume(
    resume_file: UploadFile = File(...),
    template_file: UploadFile = File(...),
) -> FormatResponse:
    ingestion = IngestionService()

    async with log_operation(service="ingestion", operation="extract_resume_text"):
        resume_data = await resume_file.read()
        resume_text = await ingestion.extract_text(
            resume_file.filename or "resume",
            resume_data,
        )

    async with log_operation(service="ingestion", operation="extract_template_text"):
        template_data = await template_file.read()
        template_text = await ingestion.extract_text(
            template_file.filename or "template.pdf",
            template_data,
        )

    async with log_operation(service="llm", operation="extract_template_schema"):
        extractor = TemplateExtractor()
        template_schema = await extractor.extract(template_text)

    async with log_operation(service="llm", operation="parse_resume"):
        parser = ResumeParser()
        resume = await parser.parse(resume_text)

    async with log_operation(service="llm", operation="map_resume_to_template"):
        mapper = TemplateContentMapper()
        form_data = await mapper.map(resume, template_schema)

    return FormatResponse(
        template_schema=template_schema,
        form_data=form_data,
        resume_json=resume.model_dump(mode="json"),
    )
