"use client";

import { Download, FileUp, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useResume } from "@/app/context/ResumeContext";
import { useToast } from "@/app/context/ToastContext";
import { DiffViewer } from "@/components/DiffViewer/DiffViewer";
import { ResumeEditor } from "@/components/ResumeEditor/ResumeEditor";
import { SectionEditor } from "@/components/SectionEditor/SectionEditor";
import { JdAnalysisResults } from "@/components/tailoring/JdAnalysisResults";
import { TailoringInProgress } from "@/components/tailoring/TailoringInProgress";
import { VersionHistory } from "@/components/VersionHistory/VersionHistory";
import { downloadPdf, tailorResume } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-errors";
import type { JDAnalysisSchema, JdSourceRequest } from "@/types/resume";

type ActionsPanelTab = "tailor" | "edit";

export function EditorView() {
  const router = useRouter();
  const { resumeJson, setPendingEdit } = useResume();
  const { showToast } = useToast();
  const [selectedSection, setSelectedSection] = useState("summary");
  const [activeTab, setActiveTab] = useState<ActionsPanelTab>("tailor");
  const [isDownloading, setIsDownloading] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysisSchema | null>(null);
  const [jdSource, setJdSource] = useState<JdSourceRequest | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);

  useEffect(() => {
    if (!resumeJson) {
      router.replace("/");
    }
  }, [resumeJson, router]);

  if (!resumeJson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-body-sm text-on-surface-variant">Loading editor...</p>
      </div>
    );
  }

  const runWithTimeout = async <T,>(task: (signal: AbortSignal) => Promise<T>) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);
    try {
      return await task(controller.signal);
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const blob = await runWithTimeout((signal) =>
        downloadPdf({ resume_json: resumeJson }, signal),
      );
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
      setIsDownloading(false);
    }
  };

  const handleEditSection = (section: string) => {
    setSelectedSection(section);
    setActiveTab("edit");
  };

  const handleJdAnalyzed = (
    analysis: JDAnalysisSchema,
    source: JdSourceRequest,
  ) => {
    setJdAnalysis(analysis);
    setJdSource(source);
  };

  const handleBackFromAnalysis = () => {
    if (isTailoring) return;
    setJdAnalysis(null);
    setJdSource(null);
  };

  const handleTailorForRole = async () => {
    if (!jdSource) return;

    setIsTailoring(true);
    try {
      const response = await runWithTimeout((signal) =>
        tailorResume(
          {
            resume_json: resumeJson,
            ...jdSource,
          },
          signal,
        ),
      );

      setPendingEdit(
        {
          proposedResumeJson: response.proposed_resume_json,
          diff: response.diff,
        },
        "Tailored for job description",
        "tailor",
      );
      setJdAnalysis(null);
      setJdSource(null);
      showToast("Tailoring ready for review.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsTailoring(false);
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
          <span className="max-w-[160px] truncate font-medium sm:max-w-none">
            {resumeJson.contact.name}
          </span>
        </nav>

        <div className="flex items-center gap-sm sm:gap-md">
          <Link
            href="/"
            className="flex items-center gap-xs rounded-lg px-sm py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container sm:px-md"
          >
            <FileUp className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Re-upload resume</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="flex items-center gap-xs rounded-lg bg-primary px-sm py-sm text-label-md text-on-primary shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:px-md"
          >
            <Download className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="hidden min-h-0 lg:flex">
          <VersionHistory />
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="custom-scrollbar flex-1 overflow-y-auto bg-[#FAFAFA] p-md pb-16 sm:p-lg sm:pb-16 lg:p-xxl lg:pb-16">
            <ResumeEditor
              resume={resumeJson}
              onEditSection={handleEditSection}
            />
          </main>

          <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center border-t border-outline-variant bg-surface-container/80 px-md backdrop-blur-md">
            <div className="flex items-center gap-xs text-[11px] text-on-surface-variant sm:text-[12px]">
              <Info className="size-[14px] shrink-0" aria-hidden />
              <span className="hidden sm:inline">
                Changes saved in this tab only. Closing the tab clears your
                session.
              </span>
              <span className="sm:hidden">
                Session-only — closing this tab clears your data.
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 max-h-[42vh] border-t border-outline-variant lg:max-h-none lg:border-t-0">
          <SectionEditor
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onJdAnalyzed={handleJdAnalyzed}
          />
        </div>
      </div>

      <DiffViewer />

      {jdAnalysis && !isTailoring ? (
        <JdAnalysisResults
          analysis={jdAnalysis}
          resume={resumeJson}
          onBack={handleBackFromAnalysis}
          onTailor={() => void handleTailorForRole()}
          isTailoring={isTailoring}
        />
      ) : null}

      {isTailoring ? <TailoringInProgress /> : null}
    </div>
  );
}
