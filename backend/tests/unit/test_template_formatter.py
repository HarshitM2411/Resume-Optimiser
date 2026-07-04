from unittest.mock import AsyncMock, patch

import pytest

from app.models.domain.resume import (
    ContactSchema,
    EducationEntry,
    ProjectEntry,
    ResumeSchema,
    SkillsSchema,
    WorkExperienceEntry,
)
from app.models.domain.template import (
    TemplateEntryFieldDef,
    TemplateFieldDef,
    TemplateFormData,
    TemplateLayoutSection,
    TemplateMappingPayload,
    TemplateSchema,
)
from app.services.rendering.template_formatter import (
    render_template_latex,
    validate_required_fields,
)
from app.services.template.content_mapper import TemplateContentMapper


SAMPLE_SCHEMA = TemplateSchema(
    template_id="dynamic-test",
    name="Test Template",
    sections=["Contact", "Summary", "Experience"],
    fields=[
        TemplateFieldDef(
            key="contact_name",
            label="Full name",
            required=True,
            section="Contact",
        ),
        TemplateFieldDef(
            key="contact_email",
            label="Email",
            required=True,
            section="Contact",
        ),
        TemplateFieldDef(
            key="summary",
            label="Summary",
            field_type="textarea",
            required=True,
            section="Summary",
        ),
        TemplateFieldDef(
            key="experience_entries",
            label="Experience",
            field_type="entry_list",
            section="Experience",
            entry_fields=[
                TemplateEntryFieldDef(key="company_title", label="Company & title"),
                TemplateEntryFieldDef(key="dates", label="Dates"),
                TemplateEntryFieldDef(
                    key="bullets",
                    label="Bullets",
                    field_type="bullets",
                ),
            ],
        ),
    ],
    layout_sections=[
        TemplateLayoutSection(
            section_key="contact",
            section_title="CONTACT",
            layout="contact_header",
            order=0,
        ),
        TemplateLayoutSection(
            section_key="summary",
            section_title="SUMMARY",
            layout="summary",
            order=1,
        ),
        TemplateLayoutSection(
            section_key="experience",
            section_title="EXPERIENCE",
            layout="entry_list",
            order=2,
        ),
    ],
)


@pytest.mark.asyncio
async def test_mapper_only_returns_schema_keys() -> None:
    resume = ResumeSchema(
        contact=ContactSchema(name="Jane Doe", email="jane@example.com"),
        summary="Backend engineer.",
        work_experience=[
            WorkExperienceEntry(
                company="Acme Corp",
                title="Engineer",
                duration="2020 - 2023",
                bullets=["Built APIs"],
            )
        ],
    )

    mapper = TemplateContentMapper()
    with patch.object(
        mapper._llm_client,
        "call",
        AsyncMock(
            return_value=TemplateMappingPayload.model_validate(
                {
                    "values": {
                        "contact_name": "Jane Doe",
                        "contact_email": "jane@example.com",
                        "summary": "Backend engineer.",
                        "experience_entries": [
                            {
                                "company_title": "Acme Corp, Engineer",
                                "dates": "2020 - 2023",
                                "bullets": ["Built APIs"],
                            }
                        ],
                        "unexpected_field": "ignored",
                    }
                }
            )
        ),
    ):
        form_data = await mapper.map(resume, SAMPLE_SCHEMA)

    assert "unexpected_field" not in form_data.values
    assert form_data.values["contact_name"] == "Jane Doe"
    assert form_data.values["experience_entries"][0]["bullets"] == ["Built APIs"]


def test_validate_required_fields() -> None:
    incomplete = TemplateFormData(
        template_id="dynamic-test",
        values={"contact_name": "Jane Doe"},
    )
    missing = validate_required_fields(incomplete, SAMPLE_SCHEMA)
    assert "contact_email" in missing
    assert "summary" in missing

    complete = TemplateFormData(
        template_id="dynamic-test",
        values={
            "contact_name": "Jane Doe",
            "contact_email": "jane@example.com",
            "summary": "Ready to contribute.",
        },
    )
    assert validate_required_fields(complete, SAMPLE_SCHEMA) == []


def test_render_template_latex_dynamic() -> None:
    data = TemplateFormData(
        template_id="dynamic-test",
        values={
            "contact_name": "Jane Doe",
            "contact_email": "jane@example.com",
            "summary": "Backend engineer.",
            "experience_entries": [
                {
                    "company_title": "Acme Corp, Engineer",
                    "dates": "2020 - 2023",
                    "bullets": ["Built APIs"],
                }
            ],
        },
    )
    latex = render_template_latex(data, SAMPLE_SCHEMA)
    assert "Jane Doe" in latex
    assert r"\resumesection{EXPERIENCE}" in latex
    assert "Built APIs" in latex
