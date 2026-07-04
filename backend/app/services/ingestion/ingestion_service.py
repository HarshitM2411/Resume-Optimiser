import magic
import zipfile
from io import BytesIO

from app.core.exceptions import FileTooLargeError, UnsupportedFormatError
from app.services.ingestion.docx_extractor import extract_docx_text
from app.services.ingestion.pdf_extractor import extract_pdf_text
from app.services.ingestion.txt_extractor import extract_txt_text

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
TXT_MIME = "text/plain"


def _is_docx(data: bytes) -> bool:
    if not data.startswith(b"PK"):
        return False
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            return "word/document.xml" in archive.namelist()
    except zipfile.BadZipFile:
        return False


class IngestionService:
    async def extract_text(self, filename: str, data: bytes) -> str:
        if len(data) > MAX_FILE_SIZE_BYTES:
            raise FileTooLargeError()

        mime_type = magic.from_buffer(data, mime=True)

        if mime_type == PDF_MIME:
            return extract_pdf_text(data)

        if mime_type == DOCX_MIME or _is_docx(data):
            return extract_docx_text(data)

        if mime_type == TXT_MIME or mime_type.startswith("text/"):
            return extract_txt_text(data)

        raise UnsupportedFormatError()
