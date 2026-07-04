export interface TemplateEntryFieldDef {
  key: string;
  label: string;
  field_type: string;
  required: boolean;
}

export interface TemplateFieldDef {
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  section: string;
  placeholder?: string | null;
  entry_fields: TemplateEntryFieldDef[];
}

export interface TemplateLayoutSection {
  section_key: string;
  section_title: string;
  layout: string;
  order: number;
}

export type TemplateFieldValue = string | Record<string, string | string[]>[];

export interface TemplateFormData {
  template_id: string;
  values: Record<string, TemplateFieldValue>;
}

export interface TemplateSchema {
  template_id: string;
  name: string;
  sections: string[];
  fields: TemplateFieldDef[];
  layout_sections: TemplateLayoutSection[];
}

export interface FormatResponse {
  template_schema: TemplateSchema;
  form_data: TemplateFormData;
  resume_json: Record<string, unknown>;
}

export interface TemplatePdfRequest {
  form_data: TemplateFormData;
  template_schema: TemplateSchema;
}

export interface FormatterState {
  templateSchema: TemplateSchema | null;
  formData: TemplateFormData | null;
}

export type TemplateEntryRecord = Record<string, string | string[]>;
