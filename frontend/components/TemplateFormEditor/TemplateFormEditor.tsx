"use client";

import { AlertCircle, Plus, Trash2 } from "lucide-react";

import {
  emptyEntry,
  fieldLabel,
  fieldsForSection,
  getEntryList,
  getMissingRequiredFields,
  updateEntryList,
  updateScalarField,
} from "@/lib/template-validation";
import type {
  TemplateEntryFieldDef,
  TemplateEntryRecord,
  TemplateFieldDef,
  TemplateFormData,
  TemplateSchema,
} from "@/types/template";

interface TemplateFormEditorProps {
  formData: TemplateFormData;
  templateSchema: TemplateSchema;
  onChange: (formData: TemplateFormData) => void;
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-md py-sm text-body-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${
    hasError
      ? "border-error bg-error-container/30"
      : "border-outline-variant bg-white"
  }`;
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-xs block text-label-md text-on-surface-variant">
      {label}
      {required ? <span className="text-error"> *</span> : null}
    </label>
  );
}

function ScalarField({
  field,
  value,
  hasError,
  onChange,
}: {
  field: TemplateFieldDef;
  value: string;
  hasError: boolean;
  onChange: (value: string) => void;
}) {
  const common = {
    className: `${inputClass(hasError)} ${field.field_type === "textarea" ? "min-h-[96px]" : ""}`,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    placeholder: field.placeholder ?? undefined,
  };

  return (
    <div>
      <FieldLabel label={field.label} required={field.required} />
      {field.field_type === "textarea" ? (
        <textarea {...common} />
      ) : (
        <input type="text" {...common} />
      )}
    </div>
  );
}

function EntryListField({
  field,
  formData,
  onChange,
}: {
  field: TemplateFieldDef;
  formData: TemplateFormData;
  onChange: (formData: TemplateFormData) => void;
}) {
  const entries = getEntryList(formData, field.key);

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <p className="text-label-md text-on-surface-variant">{field.label}</p>
        <button
          type="button"
          className="flex items-center gap-xs rounded-lg px-sm py-xs text-label-md text-primary hover:bg-primary/5"
          onClick={() =>
            onChange(
              updateEntryList(formData, field.key, [
                ...entries,
                emptyEntry(field.entry_fields),
              ]),
            )
          }
        >
          <Plus className="size-4" />
          Add entry
        </button>
      </div>

      {entries.map((entry, index) => (
        <EntryCard
          key={`${field.key}-${index}`}
          entryFields={field.entry_fields}
          entry={entry}
          index={index}
          onUpdate={(nextEntry) => {
            const next = [...entries];
            next[index] = nextEntry;
            onChange(updateEntryList(formData, field.key, next));
          }}
          onRemove={() =>
            onChange(
              updateEntryList(
                formData,
                field.key,
                entries.filter((_, i) => i !== index),
              ),
            )
          }
        />
      ))}
    </div>
  );
}

function EntryCard({
  entryFields,
  entry,
  index,
  onUpdate,
  onRemove,
}: {
  entryFields: TemplateEntryFieldDef[];
  entry: TemplateEntryRecord;
  index: number;
  onUpdate: (entry: TemplateEntryRecord) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/70 p-md">
      <div className="mb-sm flex items-center justify-between">
        <p className="text-label-md text-on-surface-variant">Entry {index + 1}</p>
        <button
          type="button"
          className="text-on-surface-variant hover:text-error"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid gap-md sm:grid-cols-2">
        {entryFields.map((entryField) => {
          if (entryField.field_type === "bullets") {
            const bullets = Array.isArray(entry[entryField.key])
              ? (entry[entryField.key] as string[])
              : [""];
            return (
              <div key={entryField.key} className="sm:col-span-2 space-y-sm">
                <FieldLabel label={entryField.label} required={entryField.required} />
                {bullets.map((bullet, bulletIndex) => (
                  <div key={`${entryField.key}-${bulletIndex}`} className="flex gap-sm">
                    <input
                      className={inputClass(false)}
                      value={bullet}
                      onChange={(event) => {
                        const nextBullets = [...bullets];
                        nextBullets[bulletIndex] = event.target.value;
                        onUpdate({ ...entry, [entryField.key]: nextBullets });
                      }}
                    />
                    <button
                      type="button"
                      className="shrink-0 text-on-surface-variant hover:text-error"
                      onClick={() =>
                        onUpdate({
                          ...entry,
                          [entryField.key]: bullets.filter((_, i) => i !== bulletIndex),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-label-md text-primary"
                  onClick={() =>
                    onUpdate({
                      ...entry,
                      [entryField.key]: [...bullets, ""],
                    })
                  }
                >
                  + Add bullet
                </button>
              </div>
            );
          }

          const value = typeof entry[entryField.key] === "string" ? entry[entryField.key] : "";
          return (
            <div
              key={entryField.key}
              className={entryField.field_type === "textarea" ? "sm:col-span-2" : ""}
            >
              <FieldLabel label={entryField.label} required={entryField.required} />
              {entryField.field_type === "textarea" ? (
                <textarea
                  className={`${inputClass(false)} min-h-[72px]`}
                  value={value}
                  onChange={(event) =>
                    onUpdate({ ...entry, [entryField.key]: event.target.value })
                  }
                />
              ) : (
                <input
                  className={inputClass(false)}
                  value={value}
                  onChange={(event) =>
                    onUpdate({ ...entry, [entryField.key]: event.target.value })
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TemplateFormEditor({
  formData,
  templateSchema,
  onChange,
}: TemplateFormEditorProps) {
  const missing = new Set(getMissingRequiredFields(formData, templateSchema));

  return (
    <div className="mx-auto max-w-3xl space-y-lg">
      {missing.size > 0 ? (
        <div className="flex items-start gap-sm rounded-lg border border-error/20 bg-error-container p-md text-body-sm text-on-error-container">
          <AlertCircle className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
          <div>
            <p className="font-medium">Complete required fields to enable download</p>
            <p className="mt-xs text-body-sm">
              Missing:{" "}
              {[...missing]
                .map((key) => fieldLabel(key, templateSchema))
                .join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      {templateSchema.sections.map((section) => {
        const sectionFields = fieldsForSection(section, templateSchema);
        if (sectionFields.length === 0) return null;

        return (
          <section
            key={section}
            className="rounded-md border border-outline-variant bg-white p-lg shadow-soft"
          >
            <h2 className="mb-md text-headline-section">{section}</h2>
            <div className="space-y-md">
              {sectionFields.map((field) => {
                if (field.field_type === "entry_list") {
                  return (
                    <EntryListField
                      key={field.key}
                      field={field}
                      formData={formData}
                      onChange={onChange}
                    />
                  );
                }

                const value =
                  typeof formData.values[field.key] === "string"
                    ? (formData.values[field.key] as string)
                    : "";

                return (
                  <ScalarField
                    key={field.key}
                    field={field}
                    value={value}
                    hasError={missing.has(field.key)}
                    onChange={(nextValue) =>
                      onChange(updateScalarField(formData, field.key, nextValue))
                    }
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
