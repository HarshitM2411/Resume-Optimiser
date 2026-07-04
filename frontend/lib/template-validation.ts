import type {
  TemplateEntryFieldDef,
  TemplateEntryRecord,
  TemplateFieldDef,
  TemplateFormData,
  TemplateSchema,
} from "@/types/template";

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function getMissingRequiredFields(
  formData: TemplateFormData,
  templateSchema: TemplateSchema,
): string[] {
  const missing: string[] = [];

  for (const field of templateSchema.fields) {
    if (!field.required) continue;
    if (isBlank(formData.values[field.key])) {
      missing.push(field.key);
    }
  }

  return missing;
}

export function isFormComplete(
  formData: TemplateFormData,
  templateSchema: TemplateSchema,
): boolean {
  return getMissingRequiredFields(formData, templateSchema).length === 0;
}

export function fieldLabel(
  key: string,
  templateSchema: TemplateSchema,
): string {
  return templateSchema.fields.find((field) => field.key === key)?.label ?? key;
}

export function fieldsForSection(
  section: string,
  templateSchema: TemplateSchema,
): TemplateFieldDef[] {
  return templateSchema.fields.filter((field) => field.section === section);
}

export function emptyEntry(entryFields: TemplateEntryFieldDef[]): TemplateEntryRecord {
  const entry: TemplateEntryRecord = {};
  for (const field of entryFields) {
    entry[field.key] = field.field_type === "bullets" ? [""] : "";
  }
  return entry;
}

export function getEntryList(
  formData: TemplateFormData,
  key: string,
): TemplateEntryRecord[] {
  const value = formData.values[key];
  return Array.isArray(value) ? (value as TemplateEntryRecord[]) : [];
}

export function updateScalarField(
  formData: TemplateFormData,
  key: string,
  value: string,
): TemplateFormData {
  return {
    ...formData,
    values: {
      ...formData.values,
      [key]: value,
    },
  };
}

export function updateEntryList(
  formData: TemplateFormData,
  key: string,
  entries: TemplateEntryRecord[],
): TemplateFormData {
  return {
    ...formData,
    values: {
      ...formData.values,
      [key]: entries,
    },
  };
}
