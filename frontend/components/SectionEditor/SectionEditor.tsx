"use client";

import {
  AlertCircle,
  ChevronDown,
  Info,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useResume } from "@/app/context/ResumeContext";
import { useToast } from "@/app/context/ToastContext";
import { analyzeJd, editResume } from "@/lib/api";
import { getErrorMessage, isUrlFetchError } from "@/lib/api-errors";
import { formatDiffValue, primaryDiffStrings } from "@/lib/diff";
import type {
  DiffItem,
  JDAnalysisSchema,
  JdSourceRequest,
  ResumeSchema,
} from "@/types/resume";

const SECTION_OPTIONS = [
  { value: "summary", label: "Professional Summary" },
  { value: "work_experience", label: "Work Experience" },
  { value: "skills", label: "Technical Skills" },
  { value: "education", label: "Education" },
  { value: "projects", label: "Projects" },
] as const;

type EditAction =
  | "rewrite"
  | "edit_bullet"
  | "add_bullet"
  | "remove_bullet";

const BASE_ACTIONS: { value: EditAction; label: string }[] = [
  { value: "rewrite", label: "Rewrite section" },
];

const EXPERIENCE_ACTIONS: { value: EditAction; label: string }[] = [
  { value: "edit_bullet", label: "Edit bullet" },
  { value: "add_bullet", label: "Add new bullet" },
  { value: "remove_bullet", label: "Remove bullet" },
  { value: "rewrite", label: "Rewrite section" },
];

const URL_FETCH_ERROR_MESSAGE =
  "Could not fetch this URL. Please paste the job description text directly.";

type ActionsPanelTab = "tailor" | "edit";
type JdInputMode = "text" | "url";

interface SectionEditorProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
  activeTab: ActionsPanelTab;
  onTabChange: (tab: ActionsPanelTab) => void;
  onJdAnalyzed: (analysis: JDAnalysisSchema, source: JdSourceRequest) => void;
  isAnalyzing?: boolean;
}

const selectClassName =
  "w-full appearance-none rounded-lg border border-outline-variant bg-surface-bright px-md py-sm pr-xl text-body-md text-on-surface outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20";

const textareaClassName =
  "w-full resize-none rounded-lg border border-outline-variant bg-surface-bright p-md text-body-md text-on-surface outline-none transition-shadow placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary/20";

const fieldLabelClassName = "text-label-caps text-outline";

function truncate(text: string, max = 42): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function buildRemoveBulletEdit(
  resume: ResumeSchema,
  entryIndex: number,
  bulletIndex: number,
): { proposedResumeJson: ResumeSchema; diff: DiffItem[] } {
  const proposed = structuredClone(resume);
  const entry = proposed.work_experience[entryIndex];
  const before = entry.bullets[bulletIndex] ?? "";
  entry.bullets = entry.bullets.filter((_, index) => index !== bulletIndex);

  return {
    proposedResumeJson: proposed,
    diff: [
      {
        section: `work_experience[${entryIndex}].bullets[${bulletIndex}]`,
        before,
        after: null,
      },
    ],
  };
}

function buildAddBulletEdit(
  resume: ResumeSchema,
  entryIndex: number,
  bulletText: string,
): { proposedResumeJson: ResumeSchema; diff: DiffItem[] } {
  const proposed = structuredClone(resume);
  const entry = proposed.work_experience[entryIndex];
  const bulletIndex = entry.bullets.length;
  entry.bullets = [...entry.bullets, bulletText];

  return {
    proposedResumeJson: proposed,
    diff: [
      {
        section: `work_experience[${entryIndex}].bullets[${bulletIndex}]`,
        before: null,
        after: bulletText,
      },
    ],
  };
}

export function SectionEditor({
  selectedSection,
  onSectionChange,
  activeTab,
  onTabChange,
  onJdAnalyzed,
  isAnalyzing = false,
}: SectionEditorProps) {
  const {
    resumeJson,
    pendingEdit,
    pendingEditKind,
    pendingEditLabel,
    setPendingEdit,
    acceptEdit,
    discardEdit,
  } = useResume();
  const { showToast } = useToast();
  const [editAction, setEditAction] = useState<EditAction>("edit_bullet");
  const [entryIndex, setEntryIndex] = useState(0);
  const [bulletIndex, setBulletIndex] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [jdMode, setJdMode] = useState<JdInputMode>("text");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [shakeUrl, setShakeUrl] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);

  const availableActions = useMemo(
    () =>
      selectedSection === "work_experience"
        ? EXPERIENCE_ACTIONS
        : BASE_ACTIONS,
    [selectedSection],
  );

  useEffect(() => {
    setEditAction(
      selectedSection === "work_experience" ? "edit_bullet" : "rewrite",
    );
    setEntryIndex(0);
    setBulletIndex(0);
  }, [selectedSection]);

  useEffect(() => {
    if (!availableActions.some((action) => action.value === editAction)) {
      setEditAction(availableActions[0].value);
    }
  }, [availableActions, editAction]);

  useEffect(() => {
    setBulletIndex(0);
  }, [entryIndex]);

  if (!resumeJson) {
    return null;
  }

  const analyzing = isAnalyzing || localAnalyzing;
  const workEntries = resumeJson.work_experience;
  const selectedEntry = workEntries[entryIndex];
  const bullets = selectedEntry?.bullets ?? [];
  const needsEntrySelect =
    selectedSection === "work_experience" &&
    (editAction === "edit_bullet" ||
      editAction === "add_bullet" ||
      editAction === "remove_bullet");
  const needsBulletSelect =
    selectedSection === "work_experience" &&
    (editAction === "edit_bullet" || editAction === "remove_bullet");
  const showSectionPending =
    activeTab === "edit" &&
    pendingEditKind === "section" &&
    pendingEdit !== null;
  const miniDiff = showSectionPending
    ? primaryDiffStrings(pendingEdit.diff)
    : null;

  const runWithTimeout = async <T,>(task: (signal: AbortSignal) => Promise<T>) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);
    try {
      return await task(controller.signal);
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const triggerUrlShake = () => {
    setShakeUrl(true);
    window.setTimeout(() => setShakeUrl(false), 400);
  };

  const sectionLabel =
    SECTION_OPTIONS.find((option) => option.value === selectedSection)
      ?.label ?? selectedSection;

  const handleApply = async () => {
    if (editAction === "remove_bullet") {
      if (!selectedEntry || bullets.length === 0) {
        showToast("Select a bullet to remove.", "error");
        return;
      }
      const edit = buildRemoveBulletEdit(resumeJson, entryIndex, bulletIndex);
      setPendingEdit(edit, `Edited: ${sectionLabel}`, "section");
      showToast("Removal ready for review.", "success");
      return;
    }

    if (editAction === "add_bullet") {
      const bulletText = instruction.trim();
      if (!bulletText) {
        showToast("Describe the bullet to add.", "error");
        return;
      }
      if (!selectedEntry) {
        showToast("Select a company first.", "error");
        return;
      }
      const edit = buildAddBulletEdit(resumeJson, entryIndex, bulletText);
      setPendingEdit(edit, `Edited: ${sectionLabel}`, "section");
      showToast("New bullet ready for review.", "success");
      return;
    }

    const resolvedInstruction = instruction.trim();
    if (!resolvedInstruction) {
      showToast("Enter AI instructions before applying.", "error");
      return;
    }

    if (editAction === "edit_bullet") {
      if (!selectedEntry || bullets.length === 0) {
        showToast("Select a bullet to edit.", "error");
        return;
      }
    }

    setIsEditing(true);
    try {
      const response = await runWithTimeout((signal) =>
        editResume(
          {
            resume_json: resumeJson,
            section: selectedSection,
            action: editAction === "edit_bullet" ? "edit_bullet" : "rewrite",
            instruction: resolvedInstruction,
            ...(editAction === "edit_bullet"
              ? { entry_index: entryIndex, bullet_index: bulletIndex }
              : {}),
          },
          signal,
        ),
      );

      setPendingEdit(
        {
          proposedResumeJson: response.proposed_resume_json,
          diff: response.diff,
        },
        `Edited: ${sectionLabel}`,
        "section",
      );
      showToast("Edit ready for review.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsEditing(false);
    }
  };

  const resolveJdSource = (): JdSourceRequest | null => {
    if (jdMode === "url") {
      if (!jdUrl.trim()) {
        showToast("Enter a job posting URL to continue.", "error");
        return null;
      }
      // Prefer pasted fallback text when URL previously failed.
      if (urlError && jdText.trim()) {
        return { jd_text: jdText.trim() };
      }
      return { jd_url: jdUrl.trim() };
    }

    if (!jdText.trim()) {
      showToast("Paste a job description to continue.", "error");
      return null;
    }
    return { jd_text: jdText.trim() };
  };

  const handleAnalyze = async () => {
    const source = resolveJdSource();
    if (!source) {
      return;
    }

    setLocalAnalyzing(true);
    try {
      const analysis = await runWithTimeout((signal) =>
        analyzeJd(source, signal),
      );
      setUrlError(null);
      onJdAnalyzed(analysis, source);
    } catch (error) {
      if (jdMode === "url" && isUrlFetchError(error) && source.jd_url) {
        setUrlError(URL_FETCH_ERROR_MESSAGE);
        triggerUrlShake();
        return;
      }
      showToast(getErrorMessage(error), "error");
    } finally {
      setLocalAnalyzing(false);
    }
  };

  const handleJdModeChange = (mode: JdInputMode) => {
    setJdMode(mode);
    if (mode === "text") {
      setUrlError(null);
    }
  };

  const handleUrlChange = (value: string) => {
    setJdUrl(value);
    if (urlError) {
      setUrlError(null);
    }
  };

  const isBusy = isEditing || analyzing;
  const showUrlErrorState = jdMode === "url" && Boolean(urlError);

  return (
    <aside className="z-20 flex h-full min-h-0 w-full flex-shrink-0 flex-col overflow-hidden border-l border-outline-variant bg-surface lg:w-[360px]">
      <div className="flex border-b border-outline-variant">
        <button
          type="button"
          onClick={() => onTabChange("tailor")}
          className={
            activeTab === "tailor"
              ? "flex-1 border-b-2 border-primary py-md text-label-md font-medium text-primary transition-all"
              : "flex-1 border-b-2 border-transparent py-md text-label-md font-medium text-on-surface-variant transition-all hover:text-on-surface"
          }
        >
          Tailor for Job
        </button>
        <button
          type="button"
          onClick={() => onTabChange("edit")}
          className={
            activeTab === "edit"
              ? "flex-1 border-b-2 border-primary py-md text-label-md font-medium text-primary transition-all"
              : "flex-1 border-b-2 border-transparent py-md text-label-md font-medium text-on-surface-variant transition-all hover:text-on-surface"
          }
        >
          Edit Section
        </button>
      </div>

      {activeTab === "tailor" ? (
        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-lg">
          <div className="mb-lg">
            <h2 className="text-headline-section text-on-surface">
              Job Optimization
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Align your resume with specific job requirements.
            </p>
          </div>

          <div className="mb-lg flex rounded-lg bg-surface-container-high p-xs">
            <button
              type="button"
              onClick={() => handleJdModeChange("text")}
              className={
                jdMode === "text"
                  ? "flex-1 rounded bg-surface-container-lowest py-sm px-md text-label-md text-primary shadow-soft transition-all"
                  : "flex-1 rounded py-sm px-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-highest"
              }
            >
              Paste text
            </button>
            <button
              type="button"
              onClick={() => handleJdModeChange("url")}
              className={
                jdMode === "url"
                  ? "flex-1 rounded bg-surface-container-lowest py-sm px-md text-label-md text-primary shadow-soft transition-all"
                  : "flex-1 rounded py-sm px-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-highest"
              }
            >
              Job URL
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-md">
            {jdMode === "text" ? (
              <>
                <label className="text-label-md font-medium text-on-surface-variant">
                  Job Description
                </label>
                <textarea
                  value={jdText}
                  onChange={(event) => setJdText(event.target.value)}
                  className={`${textareaClassName} min-h-[120px]`}
                  placeholder="Paste the job description here to optimize your resume for specific keywords and requirements..."
                />
              </>
            ) : (
              <div className="space-y-md">
                <div>
                  <label className="mb-xs block text-label-md text-on-surface-variant">
                    Job Board Link (LinkedIn, Indeed, etc.)
                  </label>
                  <div
                    className={`relative ${shakeUrl ? "animate-shake" : ""}`}
                  >
                    <input
                      type="url"
                      value={jdUrl}
                      onChange={(event) => handleUrlChange(event.target.value)}
                      aria-invalid={showUrlErrorState}
                      aria-describedby={
                        showUrlErrorState ? "jd-url-error" : undefined
                      }
                      className={
                        showUrlErrorState
                          ? "w-full rounded-lg border-2 border-error bg-surface-container-lowest px-md py-lg pr-xxxl text-body-md text-on-surface outline-none transition-all"
                          : "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg pr-md text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      }
                      placeholder="https://www.linkedin.com/jobs/view/..."
                    />
                    {showUrlErrorState ? (
                      <AlertCircle
                        className="pointer-events-none absolute right-md top-1/2 size-5 -translate-y-1/2 text-error"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  {showUrlErrorState ? (
                    <p
                      id="jd-url-error"
                      className="mt-sm flex items-center gap-xs text-label-md text-error"
                      role="alert"
                    >
                      <Info className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                      {urlError}
                    </p>
                  ) : null}
                </div>

                {showUrlErrorState ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                    <label className="mb-sm block text-label-md text-on-surface-variant">
                      Paste Job Description
                    </label>
                    <textarea
                      value={jdText}
                      onChange={(event) => setJdText(event.target.value)}
                      className="custom-scrollbar w-full resize-none border-none bg-transparent text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:ring-0"
                      placeholder="Copy and paste the job duties and requirements here..."
                      rows={8}
                    />
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={isBusy}
              className="mt-auto flex w-full shrink-0 items-center justify-center gap-sm rounded-lg bg-primary py-md text-label-md font-medium text-on-primary shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="size-5" aria-hidden />
              {analyzing
                ? "Analyzing…"
                : showUrlErrorState
                  ? "Optimize Content"
                  : "Analyze & Tailor Resume"}
            </button>
          </div>
        </div>
      ) : (
        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-md overflow-y-auto p-md">
          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <label htmlFor="section-select" className={fieldLabelClassName}>
                Section
              </label>
              <div className="relative">
                <select
                  id="section-select"
                  value={selectedSection}
                  onChange={(event) => onSectionChange(event.target.value)}
                  className={selectClassName}
                >
                  {SECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-md top-1/2 size-5 -translate-y-1/2 opacity-50" />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label htmlFor="action-select" className={fieldLabelClassName}>
                Action
              </label>
              <div className="relative">
                <select
                  id="action-select"
                  value={editAction}
                  onChange={(event) =>
                    setEditAction(event.target.value as EditAction)
                  }
                  className={selectClassName}
                >
                  {availableActions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-md top-1/2 size-5 -translate-y-1/2 opacity-50" />
              </div>
            </div>

            {needsEntrySelect ? (
              <div className="flex flex-col gap-xs">
                <label htmlFor="company-select" className={fieldLabelClassName}>
                  Company
                </label>
                <div className="relative">
                  <select
                    id="company-select"
                    value={entryIndex}
                    onChange={(event) =>
                      setEntryIndex(Number(event.target.value))
                    }
                    className={selectClassName}
                    disabled={workEntries.length === 0}
                  >
                    {workEntries.length === 0 ? (
                      <option value={0}>No companies</option>
                    ) : (
                      workEntries.map((entry, index) => (
                        <option key={`${entry.company}-${index}`} value={index}>
                          {entry.company}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-md top-1/2 size-5 -translate-y-1/2 opacity-50" />
                </div>
              </div>
            ) : null}

            {needsBulletSelect ? (
              <div className="flex flex-col gap-xs">
                <label htmlFor="bullet-select" className={fieldLabelClassName}>
                  Bullet
                </label>
                <div className="relative">
                  <select
                    id="bullet-select"
                    value={bulletIndex}
                    onChange={(event) =>
                      setBulletIndex(Number(event.target.value))
                    }
                    className={`${selectClassName} truncate`}
                    disabled={bullets.length === 0}
                  >
                    {bullets.length === 0 ? (
                      <option value={0}>No bullets</option>
                    ) : (
                      bullets.map((bullet, index) => (
                        <option key={index} value={index}>
                          {`Bullet ${index + 1} — ${truncate(bullet)}`}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-md top-1/2 size-5 -translate-y-1/2 opacity-50" />
                </div>
              </div>
            ) : null}

            {editAction !== "remove_bullet" ? (
              <div className="flex flex-col gap-xs">
                <label
                  htmlFor="instruction-input"
                  className={fieldLabelClassName}
                >
                  AI Instructions
                </label>
                <textarea
                  id="instruction-input"
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  className={textareaClassName}
                  rows={4}
                  placeholder={
                    editAction === "add_bullet"
                      ? "e.g., Led migration of payment processing to microservices…"
                      : "e.g., Make it sound more technical and results-oriented…"
                  }
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={isBusy}
              className="w-full rounded-lg bg-primary-container py-sm text-label-md text-white shadow-soft transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditing
                ? "Applying…"
                : editAction === "remove_bullet"
                  ? "Propose Removal"
                  : "Apply AI Edit"}
            </button>
          </div>

          {showSectionPending && pendingEdit ? (
            <div className="mt-lg flex flex-col gap-sm border-t border-outline-variant pt-lg">
              <h4 className="flex items-center gap-xs text-label-md font-bold text-on-surface">
                <Sparkles
                  className="size-[18px] text-tertiary-container"
                  strokeWidth={2}
                  aria-hidden
                />
                Proposed change
              </h4>

              <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-soft">
                {miniDiff ? (
                  <>
                    {miniDiff.before ? (
                      <div className="mini-diff-removed p-md text-body-sm leading-tight">
                        {miniDiff.before}
                      </div>
                    ) : null}
                    {miniDiff.after ? (
                      <div className="mini-diff-added p-md text-body-sm leading-tight">
                        {miniDiff.after}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-sm p-md">
                    {pendingEdit.diff.map((item, index) => (
                      <div
                        key={`${item.section}-${index}`}
                        className="space-y-xs"
                      >
                        <p className="text-[11px] font-medium text-on-surface-variant">
                          {item.section}
                        </p>
                        {item.before != null ? (
                          <div className="mini-diff-removed p-sm text-body-sm">
                            {formatDiffValue(item.before)}
                          </div>
                        ) : null}
                        {item.after != null ? (
                          <div className="mini-diff-added p-sm text-body-sm">
                            {formatDiffValue(item.after)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-xs flex gap-sm">
                <button
                  type="button"
                  onClick={() => acceptEdit(pendingEditLabel ?? undefined)}
                  className="flex-1 rounded-lg bg-primary-container py-sm text-label-md font-bold text-white shadow-soft transition-all hover:brightness-110"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={discardEdit}
                  className="flex-1 rounded-lg border border-outline-variant py-sm text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}
