from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.core.operation_log import log_operation
from app.models.domain.resume import ResumeSchema
from app.services.ingestion.ingestion_service import IngestionService
from app.services.llm.resume_parser import ResumeParser

router = APIRouter(tags=["parse"])


class ParseResponse(BaseModel):
    resume_json: ResumeSchema


@router.post("/parse", response_model=ParseResponse)
async def parse_resume(file: UploadFile = File(...)) -> ParseResponse:
    async with log_operation(service="ingestion", operation="extract_text"):
        data = await file.read()
        ingestion = IngestionService()
        raw_text = await ingestion.extract_text(file.filename or "upload", data)

    async with log_operation(service="llm", operation="parse_resume"):
        parser = ResumeParser()
        resume = await parser.parse(raw_text)

    return ParseResponse(resume_json=resume)
