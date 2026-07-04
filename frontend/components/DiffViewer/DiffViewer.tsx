"use client";

import {
  ArrowRight,
  Briefcase,
  Check,
  FolderKanban,
  GraduationCap,
  Brain,
  Sparkles,
  Undo2,
  User,
  Award,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useResume } from "@/app/context/ResumeContext";
import {
  applySectionOverrides,
  changeBadgeLabel,
  countChangesBySection,
  experienceMeta,
  getRootSection,
  REVIEW_SECTIONS,
  sectionsWithChanges,
  skillList,
  summarizeDiff,
  wordDiff,
  type DiffToken,
  type ReviewSectionId,
} from "@/lib/diff";
import type {
  EducationEntry,
  ProjectEntry,
  ResumeSchema,
  WorkExperienceEntry,
} from "@/types/resume";

const SECTION_ICONS: Record<ReviewSectionId, LucideIcon> = {
  contact: User,
  summary: Sparkles,
  work_experience: Briefcase,
  education: GraduationCap,
  skills: Brain,
  projects: FolderKanban,
  achievements: Award,
  certifications: BadgeCheck,
};

function InlineDiff({ tokens }: { tokens: DiffToken[] }) {
  return (
    <span className="leading-relaxed">
      {tokens.map((token, index) => {
        if (token.type === "added") {
          return (
            <span key={index} className="diff-added">
              {token.text}
            </span>
          );
        }
        if (token.type === "removed") {
          return (
            <span key={index} className="diff-removed">
              {token.text}
            </span>
          );
        }
        return <span key={index}>{token.text}</span>;
      })}
    </span>
  );
}

function SectionHeading({
  title,
  changeCount,
  isProposed,
  isUndone,
  onToggleUndo,
}: {
  title: string;
  changeCount: number;
  isProposed?: boolean;
  isUndone?: boolean;
  onToggleUndo?: () => void;
}) {
  return (
    <div className="mb-md flex items-center justify-between gap-sm">
      <h2 className="text-headline-section text-on-surface">{title}</h2>
      <div className="flex items-center gap-sm">
        {isProposed && changeCount > 0 ? (
          <span
            className={
              isUndone
                ? "rounded-full bg-surface-container-highest px-sm py-0.5 text-[10px] font-bold text-on-surface-variant"
                : "rounded-full bg-secondary px-sm py-0.5 text-[10px] font-bold text-on-secondary"
            }
          >
            {isUndone ? "UNDONE" : changeBadgeLabel(changeCount)}
          </span>
        ) : null}
        {isProposed && onToggleUndo ? (
          <button
            type="button"
            onClick={onToggleUndo}
            className={
              isUndone
                ? "inline-flex items-center gap-xs rounded-lg bg-secondary-container px-sm py-xs text-body-sm font-medium text-on-secondary-container transition-colors hover:opacity-90"
                : "inline-flex items-center gap-xs rounded-lg border border-outline-variant bg-white px-sm py-xs text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
            }
          >
            {isUndone ? (
              <>
                <Check className="size-3.5" strokeWidth={2.5} />
                Keep
              </>
            ) : (
              <>
                <Undo2 className="size-3.5" />
                Undo
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SummaryBlock({
  text,
  tokens,
  highlighted,
  dimmed,
}: {
  text?: string | null;
  tokens?: DiffToken[];
  highlighted?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "rounded-xl border border-secondary/30 bg-white p-md shadow-soft ring-1 ring-secondary/10"
          : "rounded-xl border border-outline-variant bg-surface p-md shadow-soft"
      }
    >
      <p
        className={
          dimmed
            ? "leading-relaxed text-on-surface-variant/50"
            : highlighted
              ? "leading-relaxed text-on-surface"
              : "leading-relaxed text-on-surface-variant"
        }
      >
        {tokens ? (
          <InlineDiff tokens={tokens} />
        ) : (
          text || "No summary provided."
        )}
      </p>
    </div>
  );
}

function ExperienceList({
  entries,
  originalEntries,
  highlighted,
  dimmed,
}: {
  entries: WorkExperienceEntry[];
  originalEntries?: WorkExperienceEntry[];
  highlighted?: boolean;
  dimmed?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">No experience listed.</p>
    );
  }

  return (
    <div className="space-y-md">
      {entries.map((entry, index) => {
        const original = originalEntries?.[index];
        const showDiff = Boolean(highlighted && originalEntries);

        return (
          <div
            key={`${entry.company}-${entry.title}-${index}`}
            className={
              highlighted
                ? "rounded-xl border border-secondary/30 bg-white p-md shadow-soft ring-1 ring-secondary/10"
                : "rounded-xl border border-outline-variant bg-surface p-md"
            }
          >
            <div className="mb-sm flex items-start justify-between">
              <div>
                <h3 className="text-label-md font-bold text-on-surface">
                  {entry.title}
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  {experienceMeta(entry)}
                </p>
              </div>
            </div>
            <ul className="ml-md list-disc space-y-sm text-body-md">
              {entry.bullets.map((bullet, bulletIndex) => {
                if (!showDiff) {
                  return (
                    <li
                      key={bulletIndex}
                      className={
                        dimmed
                          ? "text-on-surface-variant/50"
                          : "text-on-surface-variant"
                      }
                    >
                      {bullet}
                    </li>
                  );
                }

                const originalBullet = original?.bullets[bulletIndex];
                if (originalBullet === undefined) {
                  return (
                    <li key={bulletIndex} className="text-on-surface">
                      <span className="diff-added">{bullet}</span>
                    </li>
                  );
                }
                if (originalBullet !== bullet) {
                  return (
                    <li key={bulletIndex} className="text-on-surface">
                      <InlineDiff tokens={wordDiff(originalBullet, bullet)} />
                    </li>
                  );
                }
                return (
                  <li key={bulletIndex} className="text-on-surface-variant">
                    {bullet}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SkillsChips({
  resume,
  proposed,
  highlighted,
  dimmed,
}: {
  resume: ResumeSchema;
  proposed?: ResumeSchema;
  highlighted?: boolean;
  dimmed?: boolean;
}) {
  const current = skillList(resume.skills);
  const next = proposed ? skillList(proposed.skills) : current;
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  if (highlighted && proposed) {
    const added = next.filter((skill) => !currentSet.has(skill));
    const removed = current.filter((skill) => !nextSet.has(skill));
    const kept = next.filter((skill) => currentSet.has(skill));

    return (
      <div>
        <div className="flex flex-wrap gap-sm">
          {kept.map((skill) => (
            <span
              key={`kept-${skill}`}
              className="rounded-lg border border-secondary/20 bg-secondary-container/30 px-md py-sm text-body-md font-medium text-on-secondary-container"
            >
              {skill}
            </span>
          ))}
          {added.map((skill) => (
            <span
              key={`added-${skill}`}
              className="rounded-lg border border-secondary/20 bg-secondary-container/30 px-md py-sm text-body-md font-medium text-on-secondary-container"
            >
              + {skill}
            </span>
          ))}
          {removed.map((skill) => (
            <span
              key={`removed-${skill}`}
              className="rounded-lg bg-surface-container-high/50 px-md py-sm text-body-md text-on-surface-variant/50 line-through"
            >
              {skill}
            </span>
          ))}
        </div>
        {added.length > 0 || removed.length > 0 ? (
          <p className="mt-md text-[12px] italic text-on-surface-variant">
            Matching keywords prioritized for ATS optimization.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-sm">
      {current.map((skill) => (
        <span
          key={skill}
          className={
            dimmed
              ? "rounded-lg bg-surface-container-high px-md py-sm text-body-md text-on-surface-variant/50"
              : "rounded-lg bg-surface-container-high px-md py-sm text-body-md text-on-surface-variant"
          }
        >
          {skill}
        </span>
      ))}
      {current.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">No skills listed.</p>
      ) : null}
    </div>
  );
}

function EducationList({
  entries,
  dimmed,
  highlighted,
}: {
  entries: EducationEntry[];
  dimmed?: boolean;
  highlighted?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">No education listed.</p>
    );
  }

  return (
    <div className="space-y-md">
      {entries.map((entry, index) => (
        <div
          key={`${entry.institution}-${index}`}
          className={
            highlighted
              ? "rounded-xl border border-secondary/30 bg-white p-md shadow-soft ring-1 ring-secondary/10"
              : "rounded-xl border border-outline-variant bg-surface p-md"
          }
        >
          <h3
            className={
              dimmed
                ? "text-label-md font-bold text-on-surface/50"
                : "text-label-md font-bold text-on-surface"
            }
          >
            {entry.degree}
            {entry.field ? `, ${entry.field}` : ""}
          </h3>
          <p
            className={
              dimmed
                ? "text-body-sm text-on-surface-variant/50"
                : "text-body-sm text-on-surface-variant"
            }
          >
            {[entry.institution, entry.graduation_year]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProjectsList({
  entries,
  dimmed,
  highlighted,
}: {
  entries: ProjectEntry[];
  dimmed?: boolean;
  highlighted?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">No projects listed.</p>
    );
  }

  return (
    <div className="space-y-md">
      {entries.map((entry, index) => (
        <div
          key={`${entry.name}-${index}`}
          className={
            highlighted
              ? "rounded-xl border border-secondary/30 bg-white p-md shadow-soft ring-1 ring-secondary/10"
              : "rounded-xl border border-outline-variant bg-surface p-md"
          }
        >
          <h3
            className={
              dimmed
                ? "text-label-md font-bold text-on-surface/50"
                : "text-label-md font-bold text-on-surface"
            }
          >
            {entry.name}
          </h3>
          <p
            className={
              dimmed
                ? "mt-xs text-body-sm text-on-surface-variant/50"
                : "mt-xs text-body-sm text-on-surface-variant"
            }
          >
            {entry.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function StringList({
  items,
  dimmed,
  highlighted,
}: {
  items: string[];
  dimmed?: boolean;
  highlighted?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-body-sm text-on-surface-variant">None listed.</p>;
  }

  return (
    <ul
      className={
        highlighted
          ? "space-y-sm rounded-xl border border-secondary/30 bg-white p-md shadow-soft ring-1 ring-secondary/10"
          : "space-y-sm rounded-xl border border-outline-variant bg-surface p-md"
      }
    >
      {items.map((item) => (
        <li
          key={item}
          className={
            dimmed
              ? "text-body-md text-on-surface-variant/50"
              : "text-body-md text-on-surface-variant"
          }
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function ContactBlock({
  resume,
  dimmed,
  highlighted,
}: {
  resume: ResumeSchema;
  dimmed?: boolean;
  highlighted?: boolean;
}) {
  const { contact } = resume;
  const lines = [
    contact.name,
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin,
    contact.github,
    contact.website,
  ].filter(Boolean);

  return (
    <div
      className={
        highlighted
          ? "rounded-xl border border-secondary/30 bg-white p-md shadow-soft ring-1 ring-secondary/10"
          : "rounded-xl border border-outline-variant bg-surface p-md"
      }
    >
      <div
        className={
          dimmed
            ? "space-y-xs text-body-md text-on-surface-variant/50"
            : "space-y-xs text-body-md text-on-surface-variant"
        }
      >
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function SectionContent({
  sectionId,
  resume,
  proposed,
  mode,
}: {
  sectionId: ReviewSectionId;
  resume: ResumeSchema;
  proposed?: ResumeSchema;
  mode: "original" | "proposed";
}) {
  const isProposed = mode === "proposed";
  const highlighted = isProposed;
  const dimmed = false;
  const source = isProposed && proposed ? proposed : resume;

  switch (sectionId) {
    case "contact":
      return (
        <ContactBlock
          resume={source}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "summary":
      if (isProposed && proposed && resume.summary !== proposed.summary) {
        return (
          <SummaryBlock
            tokens={wordDiff(resume.summary ?? "", proposed.summary ?? "")}
            highlighted
          />
        );
      }
      return (
        <SummaryBlock
          text={source.summary}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "work_experience":
      return (
        <ExperienceList
          entries={source.work_experience}
          originalEntries={isProposed ? resume.work_experience : undefined}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "education":
      return (
        <EducationList
          entries={source.education}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "skills":
      return (
        <SkillsChips
          resume={resume}
          proposed={isProposed ? proposed : undefined}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "projects":
      return (
        <ProjectsList
          entries={source.projects}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "achievements":
      return (
        <StringList
          items={source.achievements}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    case "certifications":
      return (
        <StringList
          items={source.certifications}
          highlighted={highlighted}
          dimmed={dimmed}
        />
      );
    default:
      return null;
  }
}

export function DiffViewer() {
  const {
    resumeJson,
    pendingEdit,
    pendingEditKind,
    pendingEditLabel,
    acceptEdit,
    discardEdit,
  } = useResume();
  const [activeSection, setActiveSection] =
    useState<ReviewSectionId>("summary");
  const [undoneSections, setUndoneSections] = useState<Set<string>>(
    () => new Set(),
  );
  const sectionRefs = useRef<Partial<Record<ReviewSectionId, HTMLElement | null>>>(
    {},
  );

  const changeCounts = useMemo(
    () => countChangesBySection(pendingEdit?.diff ?? []),
    [pendingEdit],
  );
  const changedSections = useMemo(
    () => sectionsWithChanges(pendingEdit?.diff ?? []),
    [pendingEdit],
  );
  const summary = useMemo(
    () => summarizeDiff(pendingEdit?.diff ?? []),
    [pendingEdit],
  );

  useEffect(() => {
    if (!pendingEdit) {
      setUndoneSections(new Set());
      return;
    }
    const first = sectionsWithChanges(pendingEdit.diff)[0] ?? "summary";
    setActiveSection(first);
    setUndoneSections(new Set());
  }, [pendingEdit]);

  if (!pendingEdit || !resumeJson || pendingEditKind !== "tailor") {
    return null;
  }

  const proposed = pendingEdit.proposedResumeJson;
  const visibleSections =
    changedSections.length > 0
      ? REVIEW_SECTIONS.filter((section) =>
          changedSections.includes(section.id),
        )
      : REVIEW_SECTIONS;
  const pendingCount = pendingEdit.diff.filter(
    (item) => !undoneSections.has(getRootSection(item.section)),
  ).length;
  const keptSectionCount = changedSections.filter(
    (id) => !undoneSections.has(id),
  ).length;

  const scrollToSection = (sectionId: ReviewSectionId) => {
    setActiveSection(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const toggleUndo = (sectionId: ReviewSectionId) => {
    setUndoneSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleAccept = () => {
    const merged = applySectionOverrides(
      resumeJson,
      proposed,
      undoneSections,
    );
    acceptEdit(pendingEditLabel ?? undefined, merged);
  };

  const titleLabel = pendingEditLabel
    ? `Review changes — ${pendingEditLabel}`
    : "Review changes";

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background text-on-background">
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-low px-lg pb-md pt-lg">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-md md:flex-row md:items-end">
          <div className="space-y-xs">
            <h1 className="text-headline-page text-on-surface">{titleLabel}</h1>
            <p className="text-body-md text-on-surface-variant">
              Comparing your current resume against the proposed tailored
              version. Undo any section you want to keep as-is.
            </p>
          </div>
          <div className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-bright p-sm">
            <div className="flex size-12 items-center justify-center rounded-full border-4 border-secondary">
              <span className="text-headline-section font-bold text-secondary">
                {keptSectionCount}
              </span>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant">
                SECTIONS KEPT
              </p>
              <p className="text-body-sm font-bold text-secondary">
                {pendingCount} change{pendingCount === 1 ? "" : "s"} pending
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 overflow-hidden">
        <aside className="hidden w-xxxl shrink-0 flex-col gap-md border-r border-outline-variant bg-surface py-md md:flex">
          <div className="px-md">
            <h3 className="mb-sm text-label-caps text-on-surface-variant">
              Sections
            </h3>
          </div>
          <nav className="flex flex-col">
            {REVIEW_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              const hasChanges = (changeCounts[section.id] ?? 0) > 0;
              const isActive = activeSection === section.id;
              const isUndone = undoneSections.has(section.id);

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={
                    isActive
                      ? "relative flex flex-col items-center gap-xs border-r-2 border-primary bg-surface-container-low py-md font-bold text-primary"
                      : "relative flex flex-col items-center gap-xs py-md text-on-surface-variant transition-all hover:bg-surface-container-high"
                  }
                >
                  <Icon className="size-5" strokeWidth={2} />
                  <span className="text-label-md">{section.label}</span>
                  {hasChanges && !isUndone ? (
                    <span className="absolute right-4 top-2 size-2 rounded-full bg-secondary" />
                  ) : null}
                  {isUndone ? (
                    <span className="absolute right-4 top-2 size-2 rounded-full bg-outline" />
                  ) : null}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-outline-variant px-md pt-md">
            <p className="mb-xs text-label-caps text-on-surface-variant">
              STATUS
            </p>
            <p className="text-body-sm text-secondary">
              {pendingCount} change{pendingCount === 1 ? "" : "s"} pending
            </p>
            <button
              type="button"
              onClick={() => {
                const first = changedSections[0];
                if (first) scrollToSection(first);
              }}
              className="mt-sm w-full rounded-lg bg-surface-container-highest py-sm text-label-md text-on-surface-variant transition-colors hover:bg-outline-variant"
            >
              Review All
            </button>
          </div>
        </aside>

        <main className="custom-scrollbar grid min-h-0 flex-1 grid-cols-1 divide-x divide-outline-variant overflow-y-auto bg-surface-container-lowest md:grid-cols-2">
          <section className="space-y-xl p-lg">
            <div className="mb-md flex items-center justify-between">
              <span className="text-label-caps text-on-surface-variant">
                ORIGINAL VERSION
              </span>
              <span className="rounded bg-surface-container-high px-sm py-xs text-label-md text-on-surface-variant">
                Current
              </span>
            </div>

            {visibleSections.map((section) => (
              <div
                key={`original-${section.id}`}
                ref={(node) => {
                  sectionRefs.current[section.id] = node;
                }}
              >
                <SectionHeading title={section.label} changeCount={0} />
                <SectionContent
                  sectionId={section.id}
                  resume={resumeJson}
                  mode="original"
                />
              </div>
            ))}
          </section>

          <section className="space-y-xl bg-surface-bright p-lg">
            <div className="mb-md flex items-center justify-between">
              <span className="text-label-caps text-secondary">
                AI OPTIMIZED VERSION
              </span>
              <span className="flex items-center gap-xs rounded bg-secondary-container px-sm py-xs text-label-md text-on-secondary-container">
                <Sparkles className="size-3.5" />
                Suggested
              </span>
            </div>

            {visibleSections.map((section) => {
              const isUndone = undoneSections.has(section.id);
              const displayResume = isUndone ? resumeJson : proposed;

              return (
                <div key={`proposed-${section.id}`}>
                  <SectionHeading
                    title={section.label}
                    changeCount={changeCounts[section.id] ?? 0}
                    isProposed
                    isUndone={isUndone}
                    onToggleUndo={() => toggleUndo(section.id)}
                  />
                  <div className={isUndone ? "opacity-60" : undefined}>
                    <SectionContent
                      sectionId={section.id}
                      resume={resumeJson}
                      proposed={displayResume}
                      mode={isUndone ? "original" : "proposed"}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      </div>

      <footer className="z-50 shrink-0 border-t border-outline-variant bg-surface-container p-lg">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-md md:flex-row">
          <div className="flex items-center gap-md">
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(keptSectionCount || 1, 3) }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex size-8 items-center justify-center rounded-full bg-secondary text-on-secondary ring-2 ring-surface"
                  >
                    <Check className="size-4" strokeWidth={2.5} />
                  </div>
                ),
              )}
            </div>
            <p className="text-body-md text-on-surface">
              <span className="font-bold">
                {keptSectionCount} section
                {keptSectionCount === 1 ? "" : "s"} kept
              </span>
              {" · "}
              {summary.changeCount} change
              {summary.changeCount === 1 ? "" : "s"} total
              {undoneSections.size > 0
                ? ` · ${undoneSections.size} undone`
                : ""}
            </p>
          </div>

          <div className="flex w-full items-center gap-md md:w-auto">
            <button
              type="button"
              onClick={discardEdit}
              className="h-xxl flex-1 rounded-xl border border-outline px-xl text-label-md text-on-surface transition-colors hover:bg-surface-container-high md:flex-none"
            >
              Discard All
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={keptSectionCount === 0}
              className="flex h-xxl flex-1 items-center justify-center gap-sm rounded-xl bg-primary px-xl text-label-md text-on-primary transition-all hover:scale-[1.02] hover:shadow-overlay active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 md:flex-none"
            >
              Accept Changes
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
