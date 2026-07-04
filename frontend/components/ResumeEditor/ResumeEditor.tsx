"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { useResume } from "@/app/context/ResumeContext";
import type { ResumeSchema } from "@/types/resume";

interface ResumeEditorProps {
  resume: ResumeSchema;
  onEditSection: (section: string) => void;
}

function skillChips(resume: ResumeSchema): string[] {
  const { skills } = resume;
  return [
    ...skills.languages,
    ...skills.frameworks,
    ...skills.tools,
    ...skills.other,
  ];
}

function contactMeta(resume: ResumeSchema): string {
  const parts = [
    resume.work_experience[0]?.title,
    resume.contact.location,
  ].filter(Boolean);
  return parts.join(" • ");
}

function contactLinks(resume: ResumeSchema): string {
  const { contact } = resume;
  return [contact.email, contact.linkedin, contact.github, contact.website]
    .filter(Boolean)
    .join(" • ");
}

type DisplayBullet = {
  key: string;
  text: string;
  pending: boolean;
  removed: boolean;
};

function displayBulletsForEntry(
  entryIndex: number,
  originalBullets: string[],
  proposedBullets: string[] | undefined,
  diff: { section: string; before: unknown; after: unknown }[],
): DisplayBullet[] {
  const entryDiffs = diff.filter((item) =>
    item.section.startsWith(`work_experience[${entryIndex}].bullets[`),
  );

  if (entryDiffs.length === 0) {
    return originalBullets.map((text, index) => ({
      key: `orig-${index}`,
      text,
      pending: false,
      removed: false,
    }));
  }

  const removal = entryDiffs.find((item) => item.after == null);
  if (removal) {
    const match = removal.section.match(/\.bullets\[(\d+)\]$/);
    const removedIndex = match ? Number(match[1]) : -1;
    return originalBullets.map((text, index) => ({
      key: `orig-${index}`,
      text,
      pending: index === removedIndex,
      removed: index === removedIndex,
    }));
  }

  const addition = entryDiffs.find((item) => item.before == null);
  if (addition && proposedBullets) {
    return proposedBullets.map((text, index) => ({
      key: `prop-${index}`,
      text,
      pending: index >= originalBullets.length,
      removed: false,
    }));
  }

  // Edits: show proposed text with pending markers on changed indices.
  const source = proposedBullets ?? originalBullets;
  return source.map((text, index) => {
    const pending = entryDiffs.some((item) =>
      item.section.endsWith(`.bullets[${index}]`),
    );
    return {
      key: `prop-${index}`,
      text,
      pending,
      removed: false,
    };
  });
}

export function ResumeEditor({ resume, onEditSection }: ResumeEditorProps) {
  const { updateResumeJson, pendingEdit, pendingEditKind } = useResume();
  const chips = skillChips(resume);
  const meta = contactMeta(resume);
  const links = contactLinks(resume);

  const sectionDiff = useMemo(
    () =>
      pendingEditKind === "section" && pendingEdit ? pendingEdit.diff : [],
    [pendingEdit, pendingEditKind],
  );

  const summaryPending =
    pendingEditKind === "section" &&
    pendingEdit?.diff.some((item) => item.section === "summary");

  const proposedSummary =
    summaryPending && pendingEdit
      ? pendingEdit.proposedResumeJson.summary
      : null;

  return (
    <div className="mx-auto max-w-[800px] space-y-md pb-xxxl">
      <button
        type="button"
        onClick={() => onEditSection("summary")}
        className="resume-card relative w-full cursor-pointer rounded-xl border border-outline-variant bg-white p-lg text-left shadow-soft transition-all hover:border-outline"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-xs text-headline-page text-on-surface">
              {resume.contact.name}
            </h1>
            {meta ? (
              <p className="text-body-md text-on-surface-variant">{meta}</p>
            ) : null}
            {links ? (
              <p className="mt-1 text-body-sm text-primary">{links}</p>
            ) : null}
            {resume.contact.phone ? (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {resume.contact.phone}
              </p>
            ) : null}
          </div>
          <ChevronRight className="chevron-icon size-[20px] opacity-0 text-on-surface-variant transition-opacity" />
        </div>
      </button>

      <section
        className={
          summaryPending
            ? "resume-card edit-highlight relative rounded-xl border border-outline-variant p-lg shadow-soft transition-all"
            : "resume-card relative rounded-xl border border-outline-variant bg-white p-lg shadow-soft transition-all hover:border-outline"
        }
      >
        <div className="mb-md flex items-center justify-between">
          <h3 className="text-headline-section text-on-surface">
            Professional Summary
          </h3>
          <div className="flex items-center gap-xs">
            {summaryPending ? (
              <span className="rounded bg-tertiary-container px-xs py-[2px] text-[10px] font-bold text-white shadow-soft">
                PENDING
              </span>
            ) : (
              <Sparkles className="size-[18px] text-primary" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => onEditSection("summary")}
              className="chevron-icon opacity-0 transition-opacity"
              aria-label="Edit summary with AI"
            >
              <ChevronRight className="size-[20px] text-on-surface-variant" />
            </button>
          </div>
        </div>
        {summaryPending && proposedSummary ? (
          <p className="text-body-md leading-relaxed text-on-surface">
            {proposedSummary}
          </p>
        ) : (
          <textarea
            value={resume.summary ?? ""}
            onChange={(event) =>
              updateResumeJson({ ...resume, summary: event.target.value })
            }
            rows={3}
            placeholder="Add a professional summary..."
            className="w-full resize-none border-none bg-transparent p-0 text-body-md leading-relaxed text-on-surface outline-none focus:ring-0"
          />
        )}
      </section>

      <div className="resume-card relative w-full rounded-xl border border-outline-variant bg-white p-lg text-left shadow-soft transition-all hover:border-outline">
        <button
          type="button"
          onClick={() => onEditSection("work_experience")}
          className="mb-md flex w-full items-center justify-between"
        >
          <h3 className="text-headline-section text-on-surface">
            Work Experience
          </h3>
          <ChevronRight className="chevron-icon size-[20px] opacity-0 text-on-surface-variant transition-opacity" />
        </button>
        {resume.work_experience.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No entries</p>
        ) : (
          <div className="space-y-xl">
            {resume.work_experience.map((entry, index) => {
              const proposedEntry =
                pendingEditKind === "section" && pendingEdit
                  ? pendingEdit.proposedResumeJson.work_experience[index]
                  : undefined;
              const displayBullets = displayBulletsForEntry(
                index,
                entry.bullets,
                proposedEntry?.bullets,
                sectionDiff,
              );

              return (
                <div
                  key={`${entry.company}-${index}`}
                  className="relative border-l-2 border-surface-container-high pl-md"
                >
                  <div className="mb-xs">
                    <h4 className="text-label-md font-medium text-on-surface">
                      {entry.title}
                    </h4>
                    <p className="text-body-sm text-on-surface-variant">
                      {entry.company}
                      {entry.duration ? ` • ${entry.duration}` : ""}
                      {entry.location ? ` • ${entry.location}` : ""}
                    </p>
                  </div>
                  {displayBullets.length > 0 ? (
                    <ul className="ml-4 list-outside list-disc space-y-xs text-body-md text-on-surface-variant">
                      {displayBullets.map((bullet) => {
                        if (bullet.pending) {
                          return (
                            <li
                              key={bullet.key}
                              className="edit-highlight relative list-none rounded-r-md p-sm -ml-sm text-on-surface"
                            >
                              <span className="absolute -left-1 top-0 bottom-0 w-1 rounded-full bg-tertiary-container" />
                              <span
                                className={
                                  bullet.removed
                                    ? "line-through opacity-70"
                                    : undefined
                                }
                              >
                                {bullet.text}
                              </span>
                              <span className="absolute -right-3 top-1/2 -translate-y-1/2 rounded bg-tertiary-container px-xs py-[2px] text-[10px] font-bold text-white shadow-soft">
                                PENDING
                              </span>
                            </li>
                          );
                        }

                        return <li key={bullet.key}>{bullet.text}</li>;
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onEditSection("skills")}
        className="resume-card relative w-full cursor-pointer rounded-xl border border-outline-variant bg-white p-lg text-left shadow-soft transition-all hover:border-outline"
      >
        <div className="mb-md flex items-center justify-between">
          <h3 className="text-headline-section text-on-surface">
            Technical Skills
          </h3>
          <ChevronRight className="chevron-icon size-[20px] opacity-0 text-on-surface-variant transition-opacity" />
        </div>
        {chips.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No skills listed</p>
        ) : (
          <div className="flex flex-wrap gap-sm">
            {chips.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-secondary/20 bg-secondary-container/20 px-md py-1 text-body-sm font-medium text-secondary"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => onEditSection("education")}
        className="resume-card relative w-full cursor-pointer rounded-xl border border-outline-variant bg-white p-lg text-left shadow-soft transition-all hover:border-outline"
      >
        <div className="mb-md flex items-center justify-between">
          <h3 className="text-headline-section text-on-surface">Education</h3>
          <ChevronRight className="chevron-icon size-[20px] opacity-0 text-on-surface-variant transition-opacity" />
        </div>
        {resume.education.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No entries</p>
        ) : (
          <div className="space-y-md">
            {resume.education.map((entry, index) => (
              <div key={`${entry.institution}-${index}`}>
                <h4 className="text-label-md font-medium text-on-surface">
                  {entry.degree}
                  {entry.field ? `, ${entry.field}` : ""}
                </h4>
                <p className="text-body-sm text-on-surface-variant">
                  {entry.institution}
                  {entry.graduation_year ? ` • ${entry.graduation_year}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </button>

      {resume.projects.length > 0 ? (
        <button
          type="button"
          onClick={() => onEditSection("projects")}
          className="resume-card relative w-full cursor-pointer rounded-xl border border-outline-variant bg-white p-lg text-left shadow-soft transition-all hover:border-outline"
        >
          <div className="mb-md flex items-center justify-between">
            <h3 className="text-headline-section text-on-surface">Projects</h3>
            <ChevronRight className="chevron-icon size-[20px] opacity-0 text-on-surface-variant transition-opacity" />
          </div>
          <div className="space-y-md">
            {resume.projects.map((entry, index) => (
              <div key={`${entry.name}-${index}`}>
                <h4 className="text-label-md font-medium text-on-surface">
                  {entry.name}
                </h4>
                <p className="text-body-md text-on-surface-variant">
                  {entry.description}
                </p>
                {entry.tech_stack.length > 0 ? (
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {entry.tech_stack.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </button>
      ) : null}

      {resume.achievements.length > 0 ? (
        <section className="resume-card relative rounded-xl border border-outline-variant bg-white p-lg shadow-soft">
          <h3 className="mb-md text-headline-section text-on-surface">
            Achievements
          </h3>
          <ul className="ml-4 list-outside list-disc space-y-xs text-body-md text-on-surface-variant">
            {resume.achievements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {resume.certifications.length > 0 ? (
        <section className="resume-card relative rounded-xl border border-outline-variant bg-white p-lg shadow-soft">
          <h3 className="mb-md text-headline-section text-on-surface">
            Certifications
          </h3>
          <ul className="ml-4 list-outside list-disc space-y-xs text-body-md text-on-surface-variant">
            {resume.certifications.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
