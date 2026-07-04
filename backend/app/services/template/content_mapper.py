import json
from typing import Any

from app.models.domain.resume import ResumeSchema
from app.models.domain.template import TemplateFormData, TemplateMappingPayload, TemplateSchema
from app.services.llm.client import LLMClient

SYSTEM_PROMPT = """You are a resume content mapping assistant.
Map structured resume data into template field values.

Rules:
- Return ONLY valid JSON: { "values": { ... } }
- Use ONLY the field keys defined in the template schema.
- Map content ONLY when a clear, direct match exists in the resume JSON.
- Use empty string "" for missing scalar fields.
- Use empty array [] for missing entry_list fields.
- For entry_list fields, each item must be an object whose keys match entry_fields.
- Do NOT invent, infer, paraphrase, or generate content not present in the resume JSON.
- Do NOT fill template-specific fields (GPA, conferences, courses, etc.) unless explicit data exists in the resume.
- Preserve factual wording from the resume; normalize formatting only.
- Never copy placeholder or sample values from the template schema.
- If the resume JSON lacks data for a template field, leave it blank.
- Bullets must come from resume work_experience[].bullets or project descriptions only.
"""


class TemplateContentMapper:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self._llm_client = llm_client or LLMClient()

    async def map(self, resume: ResumeSchema, schema: TemplateSchema) -> TemplateFormData:
        user_prompt = (
            "Map the resume JSON into template field values.\n\n"
            f"TEMPLATE SCHEMA:\n{schema.model_dump_json()}\n\n"
            f"RESUME JSON:\n{json.dumps(resume.model_dump(mode='json'), indent=2)}"
        )
        payload = await self._llm_client.call(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            validate=TemplateMappingPayload.model_validate,
        )
        assert isinstance(payload, TemplateMappingPayload)

        sanitized = _sanitize_values(payload.values, schema)
        return TemplateFormData(template_id=schema.template_id, values=sanitized)


def _sanitize_values(
    values: dict[str, Any],
    schema: TemplateSchema,
) -> dict[str, Any]:
    sanitized: dict[str, Any] = {}

    for field in schema.fields:
        raw_value = values.get(field.key)
        if field.field_type == "entry_list":
            sanitized[field.key] = _sanitize_entry_list(raw_value, field.entry_fields)
        elif isinstance(raw_value, str):
            sanitized[field.key] = raw_value.strip()
        elif raw_value is None:
            sanitized[field.key] = ""
        else:
            sanitized[field.key] = str(raw_value).strip()

    return sanitized


def _sanitize_entry_list(raw_value: Any, entry_fields: list) -> list[dict[str, Any]]:
    if not isinstance(raw_value, list):
        return []

    entries: list[dict[str, Any]] = []
    field_keys = [entry_field.key for entry_field in entry_fields]

    for item in raw_value:
        if not isinstance(item, dict):
            continue

        entry: dict[str, Any] = {}
        for entry_field in entry_fields:
            value = item.get(entry_field.key)
            if entry_field.field_type == "bullets":
                entry[entry_field.key] = _sanitize_bullets(value)
            elif isinstance(value, str):
                entry[entry_field.key] = value.strip()
            elif value is None:
                entry[entry_field.key] = "" if entry_field.field_type != "bullets" else []
            else:
                entry[entry_field.key] = str(value).strip()

        if any(entry.get(key) for key in field_keys):
            entries.append(entry)

    return entries


def _sanitize_bullets(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []
