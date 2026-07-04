"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";

import { useResume } from "@/app/context/ResumeContext";
import { useToast } from "@/app/context/ToastContext";
import { parseResume } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-errors";

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

export function UploadZone() {
  const router = useRouter();
  const { setResumeJson } = useResume();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!isAcceptedFile(file)) {
      showToast("Unsupported file type. Upload PDF, DOCX, or TXT.", "error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast("File exceeds 5MB limit.", "error");
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const response = await parseResume(file, controller.signal);
      setResumeJson(response.resume_json);
      showToast("Resume parsed successfully.", "success");
      router.push("/editor");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-8 py-12 text-center transition ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          disabled={isLoading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />
        {isLoading ? (
          <p className="text-sm text-slate-600">Parsing resume...</p>
        ) : (
          <>
            <p className="font-medium text-slate-800">
              Drag and drop your resume here
            </p>
            <p className="mt-2 text-sm text-slate-500">
              or click to browse — PDF, DOCX, or TXT up to 5MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
