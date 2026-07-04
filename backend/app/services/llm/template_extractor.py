import hashlib
import json
import re

from app.models.domain.template import (
    TemplateEntryFieldDef,
    TemplateExtractionPayload,
    TemplateFieldDef,
    TemplateLayoutSection,
    TemplateSchema,
)
from app.services.llm.client import LLMClient

SYSTEM_PROMPT = """You are a resume template analysis assistant.
Extract the exact field structure from a template PDF's text content.

Rules:
- Return ONLY valid JSON matching the schema below.
- Identify every distinct fillable field/placeholder shown in the template.
- Use snake_case keys derived from the field label (e.g. contact_name, skills_languages).
- Mark required=true only for fields that are clearly essential placeholders in the template header/contact area or objective/summary line.
- Do NOT invent fields absent from the template text.
- Preserve exact section header text from the template in layout_sections.section_title.
- Assign layout type per section:
  - contact_header: name + contact details at top
  - summary: single objective/summary paragraph
  - entry_list: repeating entries with sub-fields (education, experience, projects)
  - labeled_lines: labeled single-line or paragraph fields (e.g. "Tech Finalists:", "Courses:")
  - skill_categories: skill group labels with comma-separated values
- For entry_list fields, include entry_fields describing each sub-column/line in one entry.
  Include a bullets sub-field (field_type=bullets) when entries have bullet points.
- field_type must be one of: text, textarea, entry_list
- entry_fields.field_type must be one of: text, textarea, bullets

Schema:
{
  "name": "string",
  "sections": ["string"],
  "fields": [
    {
      "key": "string",
      "label": "string",
      "field_type": "text | textarea | entry_list",
      "required": false,
      "section": "string",
      "placeholder": "string | null",
      "entry_fields": [
        {
          "key": "string",
          "label": "string",
          "field_type": "text | textarea | bullets",
          "required": false
        }
      ]
    }
  ],
  "layout_sections": [
    {
      "section_key": "string",
      "section_title": "string",
      "layout": "contact_header | summary | entry_list | labeled_lines | skill_categories",
      "order": 0
    }
  ]
}
"""


def make_template_id(template_text: str) -> str:
    digest = hashlib.sha256(template_text.encode("utf-8")).hexdigest()[:12]
    return f"dynamic-{digest}"


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return slug or "field"


class TemplateExtractor:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def extract(self, template_text: str) -> TemplateSchema:
        user_prompt = (
            "Analyze this resume template PDF text and extract its field structure.\n\n"
            f"TEMPLATE TEXT:\n{template_text}"
        )
        payload = await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validate=TemplateExtractionPayload.model_validate,
        )
        assert isinstance(payload, TemplateExtractionPayload)

        template_id = make_template_id(template_text)
        fields = _normalize_fields(payload.fields)

        layout_sections = _normalize_layout_sections(
            payload.layout_sections,
            fields,
            payload.sections,
        )
        if not layout_sections:
            layout_sections = _infer_layout_sections(fields, payload.sections)

        return TemplateSchema(
            template_id=template_id,
            name=payload.name,
            sections=payload.sections,
            fields=fields,
            layout_sections=layout_sections,
        )


def _normalize_fields(fields: list[TemplateFieldDef]) -> list[TemplateFieldDef]:
    seen: set[str] = set()
    normalized: list[TemplateFieldDef] = []

    for index, field in enumerate(fields):
        key = field.key.strip() or _slugify(field.label)
        if key in seen:
            key = f"{key}_{index + 1}"
        seen.add(key)

        entry_fields = field.entry_fields
        if field.field_type == "entry_list" and not entry_fields:
            entry_fields = [
                TemplateEntryFieldDef(key="line", label="Entry", field_type="textarea"),
            ]

        normalized.append(
            field.model_copy(update={"key": key, "entry_fields": entry_fields})
        )

    return normalized


def _infer_layout_sections(
    fields: list[TemplateFieldDef],
    sections: list[str],
) -> list[TemplateLayoutSection]:
    layout_sections: list[TemplateLayoutSection] = []
    for order, section in enumerate(sections):
        section_fields = [field for field in fields if field.section == section]
        layout = "labeled_lines"
        if section.lower() in {"contact", "header"}:
            layout = "contact_header"
        elif any(field.field_type == "entry_list" for field in section_fields):
            layout = "entry_list"
        elif section.lower() in {"summary", "objective"}:
            layout = "summary"
        elif section.lower() in {"skills"}:
            layout = "skill_categories"
        elif len(section_fields) == 1 and section_fields[0].field_type == "textarea":
            layout = "summary"

        layout_sections.append(
            TemplateLayoutSection(
                section_key=_slugify(section),
                section_title=section.upper(),
                layout=layout,
                order=order,
            )
        )
    return layout_sections


def _normalize_layout_sections(
    layout_sections: list[TemplateLayoutSection],
    fields: list[TemplateFieldDef],
    sections: list[str],
) -> list[TemplateLayoutSection]:
    if not layout_sections:
        return []

    fields_by_section: dict[str, list[TemplateFieldDef]] = {}
    for field in fields:
        fields_by_section.setdefault(field.section, []).append(field)

    normalized: list[TemplateLayoutSection] = []
    for layout in sorted(layout_sections, key=lambda item: item.order):
        section_name = _resolve_section_name(layout, sections)
        section_fields = fields_by_section.get(section_name, [])
        layout_type = layout.layout

        if any(field.field_type == "entry_list" for field in section_fields):
            layout_type = "entry_list"
        elif section_name.lower() in {"contact", "header", "contact information"}:
            layout_type = "contact_header"
        elif section_name.lower() in {"summary", "objective"}:
            layout_type = "summary"
        elif section_name.lower() in {"skills"}:
            layout_type = "skill_categories"
        elif len(section_fields) == 1 and section_fields[0].field_type == "textarea":
            layout_type = "summary"

        normalized.append(
            layout.model_copy(
                update={
                    "layout": layout_type,
                    "section_title": layout.section_title or section_name.upper(),
                }
            )
        )

    return normalized


def _resolve_section_name(layout: TemplateLayoutSection, sections: list[str]) -> str:
    for section in sections:
        if section.lower() == layout.section_title.lower():
            return section
        if _slugify(section) == layout.section_key:
            return section
    return layout.section_title
