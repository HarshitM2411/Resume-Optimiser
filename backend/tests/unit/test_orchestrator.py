from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema
from app.services.tailoring.orchestrator import TOOL_REGISTRY, Orchestrator
from app.services.tailoring.tools.entry_builder import EntryBuilder
from app.services.tailoring.tools.entry_remover import EntryRemover
from app.services.tailoring.tools.jd_tailor import JDTailor
from app.services.tailoring.tools.section_rewriter import SectionRewriter


@pytest.mark.asyncio
async def test_orchestrator_unknown_section_action_returns_422(
    sample_resume: ResumeSchema,
) -> None:
    orchestrator = Orchestrator()

    with pytest.raises(HTTPException) as exc_info:
        await orchestrator.orchestrate(
            resume=sample_resume,
            section="contact",
            action="rewrite",
            instruction="Change name",
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Unsupported section/action combination."


@pytest.mark.asyncio
async def test_orchestrator_dispatches_section_rewriter(sample_resume: ResumeSchema) -> None:
    orchestrator = Orchestrator()

    with patch.object(
        SectionRewriter,
        "invoke",
        AsyncMock(return_value="Tailored summary for backend APIs."),
    ) as mock_invoke:
        result = await orchestrator.orchestrate(
            resume=sample_resume,
            section="summary",
            action="rewrite",
            instruction="Emphasize backend APIs",
        )

    mock_invoke.assert_awaited_once()
    assert result.proposed_resume_json.summary == "Tailored summary for backend APIs."
    assert any(item.section == "summary" for item in result.diff)


@pytest.mark.asyncio
async def test_orchestrator_tailor_for_jd(sample_resume: ResumeSchema, sample_jd: JDAnalysisSchema) -> None:
    tailored = sample_resume.model_copy(update={"summary": "Senior backend engineer for APIs."})
    orchestrator = Orchestrator()

    with patch.object(JDTailor, "tailor", AsyncMock(return_value=tailored)):
        result = await orchestrator.tailor_for_jd(sample_resume, sample_jd)

    assert result.proposed_resume_json.summary == "Senior backend engineer for APIs."
    assert result.diff


def test_tool_registry_contains_expected_entries() -> None:
    assert TOOL_REGISTRY[("summary", "rewrite")] is SectionRewriter
    assert TOOL_REGISTRY[("work_experience", "add")] is EntryBuilder
    assert TOOL_REGISTRY[("projects", "remove")] is EntryRemover
