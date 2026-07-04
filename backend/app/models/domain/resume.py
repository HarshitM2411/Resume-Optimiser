from pydantic import BaseModel, EmailStr, Field


class ContactSchema(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    github: str | None = None
    website: str | None = None


class WorkExperienceEntry(BaseModel):
    company: str
    title: str
    duration: str
    location: str | None = None
    bullets: list[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field: str | None = None
    graduation_year: str | None = None


class SkillsSchema(BaseModel):
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    other: list[str] = Field(default_factory=list)


class ProjectEntry(BaseModel):
    name: str
    description: str
    tech_stack: list[str] = Field(default_factory=list)
    url: str | None = None


class ResumeSchema(BaseModel):
    contact: ContactSchema
    summary: str | None = None
    work_experience: list[WorkExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    skills: SkillsSchema = Field(default_factory=SkillsSchema)
    projects: list[ProjectEntry] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
