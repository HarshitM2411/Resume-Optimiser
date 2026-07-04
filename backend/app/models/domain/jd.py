from typing import Literal

from pydantic import BaseModel, Field

Seniority = Literal["junior", "mid", "senior", "lead", "executive"]
Tone = Literal["technical", "managerial", "hybrid"]


class JDAnalysisSchema(BaseModel):
    role_title: str
    must_have_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    seniority: Seniority
    tone: Tone
    responsibilities: list[str] = Field(default_factory=list)
