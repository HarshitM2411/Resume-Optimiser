"use client";

import { AlertCircle, FileText, FileUp } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function isResumeFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "text/plain" ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".txt")
  );
}

export type FormatterUploadZoneProps = {
  error?: string | null;
  disabled?: boolean;
  onSubmit: (resumeFile: File, templateFile: File) => void;
  onValidationError?: (message: string) => void;
};

export function FormatterUploadZone({
  error,
  disabled = false,
  onSubmit,
  onValidationError,
}: FormatterUploadZoneProps) {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const validateFile = (file: File, kind: "resume" | "template") => {
    if (file.size > MAX_FILE_SIZE) {
      onValidationError?.("File exceeds 5MB limit.");
      return false;
    }
    if (kind === "resume" && !isResumeFile(file)) {
      onValidationError?.("Resume must be PDF, DOCX, or TXT.");
      return false;
    }
    if (kind === "template" && !isPdf(file)) {
      onValidationError?.("Template must be a text-based PDF.");
      return false;
    }
    return true;
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    kind: "resume" | "template",
  ) => {
    event.preventDefault();
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (!validateFile(file, kind)) return;
    if (kind === "resume") setResumeFile(file);
    else setTemplateFile(file);
  };

  const canSubmit = resumeFile && templateFile && !disabled;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-lg">
      {error ? (
        <div className="flex items-center gap-sm rounded border border-error/20 bg-error-container p-md text-body-sm text-on-error-container">
          <AlertCircle className="size-5 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-md md:grid-cols-2">
        <UploadCard
          title="Your resume"
          description="PDF, DOCX, or TXT · max 5MB"
          icon={FileUp}
          file={resumeFile}
          disabled={disabled}
          onClick={() => resumeInputRef.current?.click()}
          onDrop={(event) => handleDrop(event, "resume")}
        />
        <UploadCard
          title="Template PDF"
          description="Text-based PDF · max 5MB"
          icon={FileText}
          file={templateFile}
          disabled={disabled}
          onClick={() => templateInputRef.current?.click()}
          onDrop={(event) => handleDrop(event, "template")}
        />
      </div>

      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && validateFile(file, "resume")) setResumeFile(file);
          event.target.value = "";
        }}
      />
      <input
        ref={templateInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && validateFile(file, "template")) setTemplateFile(file);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (resumeFile && templateFile) onSubmit(resumeFile, templateFile);
        }}
        className="w-full rounded-lg bg-primary px-lg py-md text-label-md text-on-primary shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Map resume to template
      </button>
    </div>
  );
}

function UploadCard({
  title,
  description,
  icon: Icon,
  file,
  disabled,
  onClick,
  onDrop,
}: {
  title: string;
  description: string;
  icon: typeof FileUp;
  file: File | null;
  disabled: boolean;
  onClick: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onClick();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={`rounded-md border bg-white p-lg shadow-soft transition-all ${
        disabled
          ? "pointer-events-none opacity-60"
          : "cursor-pointer border-border hover:border-primary-container"
      }`}
    >
      <div className="flex flex-col items-center gap-sm text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-container text-primary-container">
          <Icon className="size-6" strokeWidth={2} />
        </div>
        <div>
          <p className="text-headline-section">{title}</p>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
        </div>
        {file ? (
          <p className="truncate text-body-sm font-medium text-primary">
            {file.name}
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">
            Click or drop a file
          </p>
        )}
      </div>
    </div>
  );
}
