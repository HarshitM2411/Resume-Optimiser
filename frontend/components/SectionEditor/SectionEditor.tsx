"use client";

import { useMemo, useState } from "react";

import { useResume } from "@/app/context/ResumeContext";
import { useToast } from "@/app/context/ToastContext";
import { editResume, tailorResume } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-errors";

const SECTION_OPTIONS = [
  { value: "summary", label: "Summary" },
  { value: "work_experience", label: "Work Experience" },
  { value: "skills", label: "Skills" },
  { value: "education", label: "Education" },
  { value: "projects", label: "Projects" },
] as const;

const ACTION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  summary: [{ value: "rewrite", label: "Rewrite" }],
  work_experience: [
    { value: "rewrite", label: "Rewrite" },
    { value: "add", label: "Add entry" },
    { value: "remove", label: "Remove entry" },
  ],
  skills: [{ value: "rewrite", label: "Rewrite" }],
  education: [{ value: "rewrite", label: "Rewrite" }],
  projects: [
    { value: "rewrite", label: "Rewrite" },
    { value: "add", label: "Add entry" },
    { value: "remove", label: "Remove entry" },
  ],
};

interface SectionEditorProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export function SectionEditor({
  selectedSection,
  onSectionChange,
}: SectionEditorProps) {
  const { resumeJson, setPendingEdit } = useResume();
  const { showToast } = useToast();
  const [action, setAction] = useState("rewrite");
  const [instruction, setInstruction] = useState("");
  const [removeIndex, setRemoveIndex] = useState("0");
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);

  const availableActions = useMemo(
    () => ACTION_OPTIONS[selectedSection] ?? [{ value: "rewrite", label: "Rewrite" }],
    [selectedSection],
  );

  if (!resumeJson) {
    return null;
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

  const handleApply = async () => {
    if (!instruction.trim() && action !== "remove") {
      showToast("Enter an instruction before applying.", "error");
      return;
    }

    setIsEditing(true);
    try {
      const response = await runWithTimeout((signal) =>
        editResume(
          {
            resume_json: resumeJson,
            section: selectedSection,
            action,
            instruction:
              action === "remove"
                ? `Remove entry at index ${removeIndex}`
                : instruction,
            ...(action === "remove" ? { index: Number(removeIndex) } : {}),
          },
          signal,
        ),
      );

      setPendingEdit(
        {
          proposedResumeJson: response.proposed_resume_json,
          diff: response.diff,
        },
        `Edited ${selectedSection}`,
      );
      showToast("Edit ready for review.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsEditing(false);
    }
  };

  const handleTailor = async () => {
    if (!jdText.trim() && !jdUrl.trim()) {
      showToast("Paste a job description or enter a URL.", "error");
      return;
    }

    setIsTailoring(true);
    try {
      const response = await runWithTimeout((signal) =>
        tailorResume(
          {
            resume_json: resumeJson,
            ...(jdText.trim() ? { jd_text: jdText.trim() } : { jd_url: jdUrl.trim() }),
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
      );
      showToast("Tailoring ready for review.", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsTailoring(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        Edit Resume
      </h2>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Section</span>
          <select
            value={selectedSection}
            onChange={(event) => {
              const nextSection = event.target.value;
              onSectionChange(nextSection);
              setAction(ACTION_OPTIONS[nextSection]?.[0]?.value ?? "rewrite");
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {SECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Action</span>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {availableActions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {action === "remove" ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Entry index</span>
            <input
              type="number"
              min={0}
              value={removeIndex}
              onChange={(event) => setRemoveIndex(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        ) : null}
      </div>

      {action !== "remove" ? (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Instruction</span>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Describe how this section should change..."
          />
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => void handleApply()}
        disabled={isEditing || isTailoring}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isEditing ? "Applying..." : "Apply"}
      </button>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">Tailor for Job Description</h3>
        <div className="mt-3 grid gap-3">
          <textarea
            value={jdText}
            onChange={(event) => setJdText(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Paste job description text..."
          />
          <input
            type="url"
            value={jdUrl}
            onChange={(event) => setJdUrl(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Or paste HTTPS job posting URL"
          />
          <button
            type="button"
            onClick={() => void handleTailor()}
            disabled={isEditing || isTailoring}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTailoring ? "Tailoring..." : "Tailor"}
          </button>
        </div>
      </div>
    </div>
  );
}
