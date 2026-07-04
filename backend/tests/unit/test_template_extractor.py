from unittest.mock import AsyncMock, patch

import pytest

from app.models.domain.template import (
    TemplateEntryFieldDef,
    TemplateExtractionPayload,
    TemplateFieldDef,
    TemplateLayoutSection,
    TemplateSchema,
)
from app.services.llm.template_extractor import TemplateExtractor, make_template_id


@pytest.mark.asyncio
async def test_template_extractor_builds_schema() -> None:
    template_text = "FIRSTNAME LASTNAME\nEDUCATION\nEXPERIENCE\nSKILLS\nPROJECTS"
    extractor = TemplateExtractor()

    payload = {
        "name": "Robotics Resume",
        "sections": ["Contact", "Summary", "Education"],
        "fields": [
            {
                "key": "contact_name",
                "label": "Full name",
                "field_type": "text",
                "required": True,
                "section": "Contact",
                "placeholder": "FIRSTNAME LASTNAME",
                "entry_fields": [],
            },
            {
                "key": "education_entries",
                "label": "Education entries",
                "field_type": "entry_list",
                "required": False,
                "section": "Education",
                "entry_fields": [
                    {
                        "key": "institution_degree",
                        "label": "Institution & degree",
                        "field_type": "text",
                        "required": False,
                    }
                ],
            },
        ],
        "layout_sections": [
            {
                "section_key": "contact",
                "section_title": "CONTACT",
                "layout": "contact_header",
                "order": 0,
            },
            {
                "section_key": "education",
                "section_title": "EDUCATION",
                "layout": "entry_list",
                "order": 1,
            },
        ],
    }

    with patch.object(
        extractor._llm_client,
        "call",
        AsyncMock(return_value=TemplateExtractionPayload.model_validate(payload)),
    ):
        schema = await extractor.extract(template_text)

    assert schema.template_id == make_template_id(template_text)
    assert schema.name == "Robotics Resume"
    assert schema.fields[0].key == "contact_name"
    assert schema.fields[1].entry_fields[0].key == "institution_degree"
