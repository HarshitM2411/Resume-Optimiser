from unittest.mock import AsyncMock

import pytest

from app.models.domain.jd import JDAnalysisSchema
from app.services.llm.jd_analyzer import JDAnalyzer


VALID_JD = {
    "role_title": "Senior Backend Engineer",
    "must_have_skills": ["Python", "FastAPI"],
    "nice_to_have_skills": ["PostgreSQL"],
    "keywords": ["API", "microservices"],
    "seniority": "senior",
    "tone": "technical",
    "responsibilities": ["Design scalable APIs", "Mentor junior engineers"],
}


@pytest.mark.asyncio
async def test_jd_analyzer_returns_valid_schema() -> None:
    mock_client = AsyncMock()
    mock_client.call = AsyncMock(return_value=JDAnalysisSchema.model_validate(VALID_JD))

    analyzer = JDAnalyzer(llm_client=mock_client)
    result = await analyzer.analyze("We are hiring a Senior Backend Engineer.")

    assert result.role_title == "Senior Backend Engineer"
    assert result.must_have_skills == ["Python", "FastAPI"]
    assert result.seniority == "senior"
    assert result.tone == "technical"

    mock_client.call.assert_awaited_once()
    _, kwargs = mock_client.call.await_args
    assert "Senior Backend Engineer" in kwargs["user_prompt"]
    assert "seniority" in kwargs["system_prompt"]


@pytest.mark.asyncio
async def test_jd_analyzer_uses_llm_client_validation() -> None:
    mock_client = AsyncMock()
    mock_client.call = AsyncMock(
        side_effect=lambda **kwargs: kwargs["validate"](VALID_JD),
    )

    analyzer = JDAnalyzer(llm_client=mock_client)
    result = await analyzer.analyze("Backend role")

    assert isinstance(result, JDAnalysisSchema)
