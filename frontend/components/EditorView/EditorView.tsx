"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useResume } from "@/app/context/ResumeContext";
import { useToast } from "@/app/context/ToastContext";
import { DiffViewer } from "@/components/DiffViewer/DiffViewer";
import { ResumeEditor } from "@/components/ResumeEditor/ResumeEditor";
import { SectionEditor } from "@/components/SectionEditor/SectionEditor";
import { VersionHistory } from "@/components/VersionHistory/VersionHistory";
import { downloadPdf } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-errors";

export function EditorView() {
  const router = useRouter();
  const { resumeJson } = useResume();
  const { showToast } = useToast();
  const [selectedSection, setSelectedSection] = useState("summary");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!resumeJson) {
      router.replace("/");
    }
  }, [resumeJson, router]);

  if (!resumeJson) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
        <p className="text-sm text-slate-500">Loading editor...</p>
      </main>
    );
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const blob = await downloadPdf({ resume_json: resumeJson }, controller.signal);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "resume.pdf";
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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
            ← Upload another resume
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Resume Editor</h1>
        </div>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={isDownloading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isDownloading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <ResumeEditor
            resume={resumeJson}
            onEditSection={(section) => setSelectedSection(section)}
          />
          <SectionEditor
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
          />
        </div>
        <VersionHistory />
      </div>

      <DiffViewer />
    </main>
  );
}
