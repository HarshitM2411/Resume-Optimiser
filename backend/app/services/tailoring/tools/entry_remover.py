from typing import Any

from app.models.domain.resume import ResumeSchema
from app.services.tailoring.tools.base import BaseTool


class EntryRemover(BaseTool):
    async def invoke(
        self,
        resume: ResumeSchema,
        section: str,
        params: dict[str, Any],
    ) -> Any:
        if section not in {"work_experience", "projects"}:
            raise ValueError(f"EntryRemover does not support section '{section}'.")

        entries = getattr(resume, section)
        if not entries:
            raise ValueError(f"No entries found in section '{section}'.")

        index = params.get("index")
        identifier = params.get("identifier")

        if index is None and identifier is None:
            raise ValueError("EntryRemover requires index or identifier.")

        if index is None:
            index = next(
                (
                    i
                    for i, entry in enumerate(entries)
                    if _entry_identifier(entry, section) == identifier
                ),
                None,
            )
            if index is None:
                raise ValueError(f"No entry matched identifier '{identifier}'.")

        if index < 0 or index >= len(entries):
            raise ValueError("index is out of range.")

        updated_entries = [
            entry.model_dump()
            for i, entry in enumerate(entries)
            if i != index
        ]
        return updated_entries


def _entry_identifier(entry: Any, section: str) -> str:
    if section == "work_experience":
        return entry.company
    return entry.name
