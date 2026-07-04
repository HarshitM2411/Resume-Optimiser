from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.domain.resume import ContactSchema, ResumeSchema


VALID_RESUME = ResumeSchema(
    contact=ContactSchema(
        name="Jane Doe",
        email="jane@example.com",
    ),
    summary="Engineer",
)


@pytest.mark.asyncio
async def test_parse_endpoint_returns_resume_json(text_pdf_bytes: bytes) -> None:
    transport = ASGITransport(app=app)

    with patch("app.api.v1.routers.parse.ResumeParser") as parser_cls:
        parser = parser_cls.return_value
        parser.parse = AsyncMock(return_value=VALID_RESUME)

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            response = await client.post(
                "/api/v1/parse",
                files={"file": ("resume.pdf", text_pdf_bytes, "application/pdf")},
            )

    assert response.status_code == 200
    body = response.json()
    assert body["resume_json"]["contact"]["name"] == "Jane Doe"
    parser.parse.assert_awaited_once()


@pytest.mark.asyncio
async def test_parse_endpoint_maps_file_too_large() -> None:
    transport = ASGITransport(app=app)
    oversized = b"x" * (5 * 1024 * 1024 + 1)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Host": "localhost"},
    ) as client:
        response = await client.post(
            "/api/v1/parse",
            files={"file": ("resume.pdf", oversized, "application/pdf")},
        )

    assert response.status_code == 413
    assert response.json()["detail"] == "File exceeds 5MB limit."
