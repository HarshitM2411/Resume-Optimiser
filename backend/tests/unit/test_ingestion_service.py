import pytest

from app.core.exceptions import (
    FileTooLargeError,
    InvalidTextEncodingError,
    PasswordProtectedPDFError,
    ScannedPDFError,
    UnsupportedFormatError,
)
from app.services.ingestion.ingestion_service import IngestionService, MAX_FILE_SIZE_BYTES


@pytest.mark.asyncio
async def test_rejects_files_larger_than_5mb() -> None:
    service = IngestionService()
    oversized = b"x" * (MAX_FILE_SIZE_BYTES + 1)

    with pytest.raises(FileTooLargeError):
        await service.extract_text("resume.pdf", oversized)


@pytest.mark.asyncio
async def test_rejects_scanned_pdf(text_pdf_bytes: bytes, scanned_pdf_bytes: bytes) -> None:
    service = IngestionService()

    with pytest.raises(ScannedPDFError):
        await service.extract_text("scanned.pdf", scanned_pdf_bytes)


@pytest.mark.asyncio
async def test_rejects_password_protected_pdf(password_pdf_bytes: bytes) -> None:
    service = IngestionService()

    with pytest.raises(PasswordProtectedPDFError):
        await service.extract_text("locked.pdf", password_pdf_bytes)


@pytest.mark.asyncio
async def test_extracts_text_pdf(text_pdf_bytes: bytes) -> None:
    service = IngestionService()

    text = await service.extract_text("resume.pdf", text_pdf_bytes)

    assert "Jane Doe" in text
    assert "jane@example.com" in text


@pytest.mark.asyncio
async def test_extracts_docx_with_tables_in_order(docx_with_table_bytes: bytes) -> None:
    service = IngestionService()

    text = await service.extract_text("resume.docx", docx_with_table_bytes)

    assert "Header paragraph" in text
    assert "Table cell A" in text
    assert "Table cell B" in text
    assert "Footer paragraph" in text
    assert text.index("Header paragraph") < text.index("Table cell A")
    assert text.index("Table cell A") < text.index("Footer paragraph")


@pytest.mark.asyncio
async def test_extracts_utf8_txt(utf8_txt_bytes: bytes) -> None:
    service = IngestionService()

    text = await service.extract_text("resume.txt", utf8_txt_bytes)

    assert "Alex" in text
    assert "Python" in text


@pytest.mark.asyncio
async def test_rejects_non_utf8_txt() -> None:
    service = IngestionService()
    invalid = "résumé".encode("latin-1")

    with pytest.raises(InvalidTextEncodingError):
        await service.extract_text("resume.txt", invalid)


@pytest.mark.asyncio
async def test_rejects_unsupported_format() -> None:
    service = IngestionService()

    with pytest.raises(UnsupportedFormatError):
        await service.extract_text("archive.zip", b"PK\x03\x04fakezipcontent")
