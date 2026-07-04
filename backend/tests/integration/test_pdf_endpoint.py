from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.domain.resume import ResumeSchema


MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.mark.asyncio
async def test_pdf_endpoint_returns_pdf_attachment(sample_resume: ResumeSchema) -> None:
    transport = ASGITransport(app=app)

    with patch(
        "app.api.v1.routers.pdf.compile_pdf",
        AsyncMock(return_value=MINIMAL_PDF),
    ):
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            response = await client.post(
                "/api/v1/pdf",
                json={"resume_json": sample_resume.model_dump()},
            )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers.get("content-disposition", "")
    assert response.content.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_parse_then_pdf_end_to_end(
    sample_resume: ResumeSchema,
    text_pdf_bytes: bytes,
) -> None:
    transport = ASGITransport(app=app)

    with (
        patch("app.api.v1.routers.parse.ResumeParser") as parser_cls,
        patch("app.api.v1.routers.pdf.compile_pdf", AsyncMock(return_value=MINIMAL_PDF)),
    ):
        parser_cls.return_value.parse = AsyncMock(return_value=sample_resume)

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            parse_response = await client.post(
                "/api/v1/parse",
                files={"file": ("resume.pdf", text_pdf_bytes, "application/pdf")},
            )
            assert parse_response.status_code == 200
            resume_json = parse_response.json()["resume_json"]

            pdf_response = await client.post(
                "/api/v1/pdf",
                json={"resume_json": resume_json},
            )

    assert pdf_response.status_code == 200
    assert pdf_response.content.startswith(b"%PDF-")
    assert len(pdf_response.content) > 0
