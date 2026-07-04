from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.domain.resume import ResumeSchema
from app.services.tailoring.tools.section_rewriter import SectionRewriter


@pytest.mark.asyncio
async def test_edit_endpoint_summary_rewrite_returns_diff_and_proposed_resume(
    sample_resume: ResumeSchema,
) -> None:
    transport = ASGITransport(app=app)
    rewritten_summary = "Senior backend engineer specializing in API platforms."

    with patch.object(
        SectionRewriter,
        "invoke",
        AsyncMock(return_value=rewritten_summary),
    ):
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            response = await client.post(
                "/api/v1/edit",
                json={
                    "resume_json": sample_resume.model_dump(),
                    "section": "summary",
                    "action": "rewrite",
                    "instruction": "Make the summary more senior and API-focused.",
                },
            )

    assert response.status_code == 200
    body = response.json()

    assert body["proposed_resume_json"]["summary"] == rewritten_summary
    assert body["proposed_resume_json"]["contact"]["email"] == "jane@example.com"
    assert isinstance(body["diff"], list)
    assert len(body["diff"]) >= 1
    assert any(item["section"] == "summary" for item in body["diff"])
    assert any(
        item["before"] == sample_resume.summary and item["after"] == rewritten_summary
        for item in body["diff"]
    )


@pytest.mark.asyncio
async def test_edit_endpoint_rejects_unsupported_section_action(
    sample_resume: ResumeSchema,
) -> None:
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Host": "localhost"},
    ) as client:
        response = await client.post(
            "/api/v1/edit",
            json={
                "resume_json": sample_resume.model_dump(),
                "section": "contact",
                "action": "rewrite",
                "instruction": "Change my name.",
            },
        )

    assert response.status_code == 422
    assert response.json()["detail"] == "Unsupported section/action combination."
