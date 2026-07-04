from typing import Any

from pydantic import BaseModel, Field, model_validator


class TemplateEntryFieldDef(BaseModel):
    key: str
    label: str
    field_type: str = "text"
    required: bool = False


class TemplateFieldDef(BaseModel):
    key: str
    label: str
    field_type: str = "text"
    required: bool = False
    section: str
    placeholder: str | None = None
    entry_fields: list[TemplateEntryFieldDef] = Field(default_factory=list)


class TemplateLayoutSection(BaseModel):
    section_key: str
    section_title: str
    layout: str
    order: int


class TemplateSchema(BaseModel):
    template_id: str
    name: str
    sections: list[str]
    fields: list[TemplateFieldDef]
    layout_sections: list[TemplateLayoutSection] = Field(default_factory=list)

    @model_validator(mode="after")
    def sort_layout_sections(self) -> "TemplateSchema":
        self.layout_sections = sorted(self.layout_sections, key=lambda item: item.order)
        return self


class TemplateFormData(BaseModel):
    template_id: str
    values: dict[str, Any] = Field(default_factory=dict)


class TemplateExtractionPayload(BaseModel):
    name: str
    sections: list[str]
    fields: list[TemplateFieldDef]
    layout_sections: list[TemplateLayoutSection]


class TemplateMappingPayload(BaseModel):
    values: dict[str, Any]


class FormatResponse(BaseModel):
    template_schema: TemplateSchema
    form_data: TemplateFormData
    resume_json: dict


class TemplatePdfRequest(BaseModel):
    form_data: TemplateFormData
    template_schema: TemplateSchema
