"use client";

import { Download, FileUp, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useFormatter } from "@/app/context/FormatterContext";
import { useToast } from "@/app/context/ToastContext";
import { TemplateFormEditor } from "@/components/TemplateFormEditor/TemplateFormEditor";
import { downloadPdf } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-errors";
import { isFormComplete } from "@/lib/template-validation";

export function FormatterView() {
  const router = useRouter();
  const { templateSchema, formData, updateFormData } = useFormatter();
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!templateSchema || !formData) {
      router.replace("/?mode=format");
    }
  }, [templateSchema, formData, router]);

  const canDownload = useMemo(() => {
    if (!formData || !templateSchema) return false;
    return isFormComplete(formData, templateSchema);
  }, [formData, templateSchema]);

  if (!templateSchema || !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-body-sm text-on-surface-variant">Loading formatter...</p>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!canDownload) return;

    setIsDownloading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120000);

    try {
      const blob = await downloadPdf(
        { form_data: formData, template_schema: templateSchema },
        controller.signal,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "formatted-resume.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("PDF downloaded.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      window.clearTimeout(timeoutId);
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAFAFA] text-on-surface">
      <header className="z-30 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-md sm:px-lg">
        <nav className="flex items-center text-body-sm text-on-surface-variant">
          <Link
            href="/"
            className="font-medium text-on-surface transition-colors hover:text-primary"
          >
            Resume Optimiser
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="font-medium">Template formatter</span>
        </nav>

        <div className="flex items-center gap-sm sm:gap-md">
          <Link
            href="/?mode=format"
            className="flex items-center gap-xs rounded-lg px-sm py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container sm:px-md"
          >
            <FileUp className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Re-upload</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!canDownload || isDownloading}
            title={
              canDownload
                ? "Download formatted PDF"
                : "Complete all required fields first"
            }
            className="flex items-center gap-xs rounded-lg bg-primary px-sm py-sm text-label-md text-on-primary shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-md"
          >
            <Download className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </span>
          </button>
        </div>
      </header>

      <main className="custom-scrollbar flex-1 overflow-y-auto p-md sm:p-lg lg:p-xxl">
        <div className="mb-lg space-y-xs">
          <h1 className="text-headline-page">{templateSchema.name}</h1>
          <p className="text-body-sm text-on-surface-variant">
            Auto-filled fields come from your uploaded resume. Empty fields were
            not found in your source — fill them in or leave blank. The form is
            generated dynamically from your template PDF; nothing is invented.
          </p>
        </div>

        <TemplateFormEditor
          formData={formData}
          templateSchema={templateSchema}
          onChange={updateFormData}
        />
      </main>

      <div className="flex h-12 items-center justify-center border-t border-outline-variant bg-surface-container/80 px-md backdrop-blur-md">
        <div className="flex items-center gap-xs text-[11px] text-on-surface-variant sm:text-[12px]">
          <Info className="size-[14px] shrink-0" aria-hidden />
          <span>
            Template: {templateSchema.name} · Required fields must be completed
            before download
          </span>
        </div>
      </div>
    </div>
  );
}
