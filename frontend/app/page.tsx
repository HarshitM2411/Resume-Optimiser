"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, Suspense } from "react";

import { useFormatter } from "@/app/context/FormatterContext";
import { useResume } from "@/app/context/ResumeContext";
import { useToast } from "@/app/context/ToastContext";
import { LandingScreen } from "@/components/landing/LandingScreen";
import { UploadLoadingScreen } from "@/components/upload/UploadLoadingScreen";
import { formatResume, parseResume } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-errors";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "format" ? "format" : "tailor";
  const { setResumeJson } = useResume();
  const { setFormatterResult } = useFormatter();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const runWithTimeout = async <T,>(task: (signal: AbortSignal) => Promise<T>) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120000);
    try {
      return await task(controller.signal);
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setIsUploading(true);

      try {
        const response = await runWithTimeout((signal) =>
          parseResume(file, signal),
        );
        setResumeJson(response.resume_json);
        showToast("Resume parsed successfully.", "success");
        router.push("/editor");
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        showToast(message, "error");
        setIsUploading(false);
      }
    },
    [router, setResumeJson, showToast],
  );

  const handleFormatSubmit = useCallback(
    async (resumeFile: File, templateFile: File) => {
      setError(null);
      setFileName(`${resumeFile.name} + ${templateFile.name}`);
      setIsUploading(true);

      try {
        const response = await runWithTimeout((signal) =>
          formatResume(resumeFile, templateFile, signal),
        );
        setFormatterResult(response.template_schema, response.form_data);
        showToast("Resume mapped to template.", "success");
        router.push("/formatter");
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        showToast(message, "error");
        setIsUploading(false);
      }
    },
    [router, setFormatterResult, showToast],
  );

  const handleValidationError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (isUploading) {
    return <UploadLoadingScreen fileName={fileName} />;
  }

  return (
    <LandingScreen
      mode={mode}
      error={error}
      onFileSelected={handleFileSelected}
      onFormatSubmit={handleFormatSubmit}
      onValidationError={handleValidationError}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <p className="text-body-sm text-on-surface-variant">Loading...</p>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
