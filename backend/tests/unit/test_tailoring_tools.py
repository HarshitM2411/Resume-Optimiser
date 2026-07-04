from unittest.mock import AsyncMock

import pytest

from app.models.domain.jd import JDAnalysisSchema
from app.models.domain.resume import ResumeSchema, WorkExperienceEntry
from app.services.tailoring.tools.bullet_editor import BulletEditor
from app.services.tailoring.tools.entry_builder import EntryBuilder
from app.services.tailoring.tools.entry_remover import EntryRemover
from app.services.tailoring.tools.jd_tailor import JDTailor
from app.services.tailoring.tools.section_rewriter import SectionRewriter


@pytest.mark.asyncio
async def test_jd_tailor_returns_resume_schema(
    sample_resume: ResumeSchema,
    sample_jd: JDAnalysisSchema,
) -> None:
    tailored = sample_resume.model_copy(update={"summary": "Aligned summary"})
    mock_client = AsyncMock()
    mock_client.call = AsyncMock(return_value=tailored)

    tool = JDTailor(llm_client=mock_client)
    result = await tool.tailor(sample_resume, sample_jd)

    assert isinstance(result, ResumeSchema)
    assert result.summary == "Aligned summary"
    mock_client.call.assert_awaited_once()


@pytest.mark.asyncio
async def test_section_rewriter_returns_updated_section(sample_resume: ResumeSchema) -> None:
    mock_client = AsyncMock()
    mock_client.call = AsyncMock(return_value={"summary": "Rewritten summary"})

    tool = SectionRewriter(llm_client=mock_client)
    result = await tool.invoke(
        resume=sample_resume,
        section="summary",
        params={"instruction": "Make it concise"},
    )

    assert result == "Rewritten summary"


@pytest.mark.asyncio
async def test_entry_builder_returns_work_experience_entry(sample_resume: ResumeSchema) -> None:
    entry = WorkExperienceEntry(
        company="Beta Inc",
        title="Intern",
        duration="2020",
        bullets=["Automated reports"],
    )
    mock_client = AsyncMock()
    mock_client.call = AsyncMock(return_value=entry)

    tool = EntryBuilder(llm_client=mock_client)
    result = await tool.invoke(
        resume=sample_resume,
        section="work_experience",
        params={"instruction": "Add internship at Beta Inc in 2020"},
    )

    assert result["company"] == "Beta Inc"
    mock_client.call.assert_awaited_once()


@pytest.mark.asyncio
async def test_bullet_editor_returns_rewritten_bullet(sample_resume: ResumeSchema) -> None:
    mock_client = AsyncMock()
    mock_client.call = AsyncMock(return_value={"bullet": "Built APIs reducing latency by 20%."})

    tool = BulletEditor(llm_client=mock_client)
    result = await tool.invoke(
        resume=sample_resume,
        section="work_experience",
        params={
            "instruction": "Add impact",
            "entry_index": 0,
            "bullet_index": 0,
        },
    )

    assert "latency" in result


@pytest.mark.asyncio
async def test_entry_remover_does_not_call_llm(sample_resume: ResumeSchema) -> None:
    tool = EntryRemover()

    result = await tool.invoke(
        resume=sample_resume,
        section="work_experience",
        params={"index": 0},
    )

    assert result == []
