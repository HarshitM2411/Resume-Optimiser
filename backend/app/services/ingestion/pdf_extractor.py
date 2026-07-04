import fitz

from app.core.exceptions import (
    CorruptedPDFError,
    PasswordProtectedPDFError,
    ScannedPDFError,
)


def extract_pdf_text(data: bytes) -> str:
    try:
        document = fitz.open(stream=data, filetype="pdf")
    except fitz.FileDataError as exc:
        raise CorruptedPDFError() from exc

    try:
        if document.is_encrypted and document.needs_pass:
            raise PasswordProtectedPDFError()

        text_parts: list[str] = []
        for page in document:
            text_parts.append(page.get_text())

        text = "\n".join(text_parts).strip()
        if not text:
            raise ScannedPDFError()

        return text
    finally:
        document.close()
