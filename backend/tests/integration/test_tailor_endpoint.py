from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.domain.diff import PendingEditResponse
from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema


@pytest.mark.asyncio
async def test_tailor_endpoint_requires_jd_source(sample_resume: ResumeSchema) -> None:
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Host": "localhost"},
    ) as client:
        response = await client.post(
            "/api/v1/tailor",
            json={"resume_json": sample_resume.model_dump()},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_tailor_endpoint_with_jd_text(sample_resume: ResumeSchema, sample_jd: JDAnalysisSchema) -> None:
    transport = ASGITransport(app=app)
    tailored = sample_resume.model_copy(update={"summary": "API-focused backend engineer."})

    with (
        patch("app.api.v1.routers.tailor.JDAnalyzer") as analyzer_cls,
        patch("app.api.v1.routers.tailor.Orchestrator") as orchestrator_cls,
    ):
        analyzer_cls.return_value.analyze = AsyncMock(return_value=sample_jd)
        orchestrator_cls.return_value.tailor_for_jd = AsyncMock(
            return_value=PendingEditResponse(
                proposed_resume_json=tailored,
                diff=[],
            )
        )

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            response = await client.post(
                "/api/v1/tailor",
                json={
                    "resume_json": sample_resume.model_dump(),
                    "jd_text": "Hiring Senior Backend Engineer with Python and FastAPI.",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["proposed_resume_json"]["summary"] == "API-focused backend engineer."


@pytest.mark.asyncio
async def test_tailor_endpoint_with_jd_url(sample_resume: ResumeSchema, sample_jd: JDAnalysisSchema) -> None:
    transport = ASGITransport(app=app)
    tailored = sample_resume.model_copy(update={"summary": "Aligned to role."})

    with (
        patch("app.api.v1.routers.tailor.fetch_jd_url", AsyncMock(return_value="Senior Backend Engineer")),
        patch("app.api.v1.routers.tailor.JDAnalyzer") as analyzer_cls,
        patch("app.api.v1.routers.tailor.Orchestrator") as orchestrator_cls,
    ):
        analyzer_cls.return_value.analyze = AsyncMock(return_value=sample_jd)
        orchestrator_cls.return_value.tailor_for_jd = AsyncMock(
            return_value=PendingEditResponse(
                proposed_resume_json=tailored,
                diff=[],
            )
        )

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"Host": "localhost"},
        ) as client:
            response = await client.post(
                "/api/v1/tailor",
                json={
                    "resume_json": sample_resume.model_dump(),
                    "jd_url": "https://example.com/jobs/123",
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["proposed_resume_json"]["summary"] == "Aligned to role."
