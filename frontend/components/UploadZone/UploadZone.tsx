"use client";

import { AlertCircle, FileUp, PlusCircle } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export type UploadZoneProps = {
  error?: string | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  onValidationError?: (message: string) => void;
};

export function UploadZone({
  error,
  disabled = false,
  onFileSelected,
  onValidationError,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSelect = (file: File) => {
    if (!isAcceptedFile(file)) {
      onValidationError?.(
        "Unsupported file type. Upload PDF, DOCX, or TXT.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onValidationError?.("File exceeds 5MB limit.");
      return;
    }

    onFileSelected(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-lg">
      {error ? (
        <div className="flex items-center gap-sm rounded border border-error/20 bg-error-container p-md text-body-sm text-on-error-container">
          <AlertCircle className="size-5 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative cursor-pointer rounded-md border bg-white p-xxl shadow-soft transition-all duration-200 ${
          isDragging
            ? "scale-[1.02] border-2 border-dashed border-primary bg-primary/5"
            : "border-border hover:border-primary-container"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              validateAndSelect(file);
            }
            event.target.value = "";
          }}
        />

        {isDragging ? (
          <div className="flex flex-col items-center gap-md py-md">
            <PlusCircle
              className="size-8 animate-bounce text-primary"
              strokeWidth={2}
            />
            <p className="text-headline-section text-primary">
              Ready to drop your file
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-md py-md">
            <div className="flex size-16 items-center justify-center rounded-full bg-surface-container text-primary-container">
              <FileUp className="size-8" strokeWidth={2} />
            </div>
            <div className="space-y-xs text-center">
              <p className="text-headline-section text-on-background">
                Drop your resume here or click to browse
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Max 5MB · Text-based PDFs only
              </p>
            </div>
            <div className="mt-sm flex gap-sm">
              <span className="rounded-full bg-primary-fixed px-md py-1 text-label-caps text-on-primary-fixed-variant">
                PDF
              </span>
              <span className="rounded-full bg-surface-container-high px-md py-1 text-label-caps text-on-surface-variant">
                DOCX
              </span>
              <span className="rounded-full bg-surface-container-high px-md py-1 text-label-caps text-on-surface-variant">
                TXT
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
