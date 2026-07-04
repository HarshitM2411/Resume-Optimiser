from typing import Any

from app.models.domain.diff import DiffItem
from app.models.domain.resume import ResumeSchema, SkillsSchema

LIST_SECTIONS = {"work_experience", "education", "projects", "achievements", "certifications"}


def compute_diff(before: ResumeSchema, after: ResumeSchema) -> list[DiffItem]:
    return _diff_values("", before.model_dump(), after.model_dump())


def _diff_values(path: str, before: Any, after: Any) -> list[DiffItem]:
    if before == after:
        return []

    if isinstance(before, dict) and isinstance(after, dict):
        items: list[DiffItem] = []
        keys = sorted(set(before) | set(after))
        for key in keys:
            child_path = f"{path}.{key}" if path else key
            items.extend(_diff_values(child_path, before.get(key), after.get(key)))
        return items

    if isinstance(before, list) and isinstance(after, list):
        items: list[DiffItem] = []
        max_len = max(len(before), len(after))
        for index in range(max_len):
            child_path = f"{path}[{index}]"
            before_value = before[index] if index < len(before) else None
            after_value = after[index] if index < len(after) else None
            items.extend(_diff_values(child_path, before_value, after_value))
        return items

    return [DiffItem(section=path or "root", before=before, after=after)]


def merge_fragment(
    resume: ResumeSchema,
    section: str,
    action: str,
    fragment: Any,
) -> ResumeSchema:
    data = resume.model_dump()

    if action == "add":
        if section not in {"work_experience", "projects"}:
            raise ValueError(f"Add action is not supported for section '{section}'.")
        current = list(data.get(section, []))
        current.append(fragment)
        data[section] = current
        return ResumeSchema.model_validate(data)

    if action == "remove":
        if section not in {"work_experience", "projects"}:
            raise ValueError(f"Remove action is not supported for section '{section}'.")
        data[section] = fragment
        return ResumeSchema.model_validate(data)

    if section == "skills":
        data["skills"] = fragment if isinstance(fragment, dict) else SkillsSchema.model_validate(fragment).model_dump()
        return ResumeSchema.model_validate(data)

    if section in LIST_SECTIONS:
        data[section] = fragment
        return ResumeSchema.model_validate(data)

    data[section] = fragment if not isinstance(fragment, dict) or section not in fragment else fragment[section]
    return ResumeSchema.model_validate(data)


def get_section_value(resume: ResumeSchema, section: str) -> Any:
    if section == "skills":
        return resume.skills.model_dump()
    value = getattr(resume, section)
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, list):
        return [item.model_dump() if hasattr(item, "model_dump") else item for item in value]
    return value
