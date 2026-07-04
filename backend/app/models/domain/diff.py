from typing import Any

from pydantic import BaseModel, Field

from app.models.domain.resume import ResumeSchema


class DiffItem(BaseModel):
    section: str
    before: Any
    after: Any


class PendingEditResponse(BaseModel):
    proposed_resume_json: ResumeSchema
    diff: list[DiffItem] = Field(default_factory=list)
