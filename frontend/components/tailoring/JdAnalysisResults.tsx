"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Info,
  Lightbulb,
  Sparkles,
  Terminal,
  TrendingUp,
} from "lucide-react";

import { computeMatchScore } from "@/lib/match-score";
import type { JDAnalysisSchema, ResumeSchema, Seniority, Tone } from "@/types/resume";

const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

const TONE_LABELS: Record<Tone, string> = {
  technical: "Technical tone",
  managerial: "Managerial tone",
  hybrid: "Hybrid tone",
};

type JdAnalysisResultsProps = {
  analysis: JDAnalysisSchema;
  resume: ResumeSchema;
  onBack: () => void;
  onTailor: () => void;
  isTailoring?: boolean;
};

export function JdAnalysisResults({
  analysis,
  resume,
  onBack,
  onTailor,
  isTailoring = false,
}: JdAnalysisResultsProps) {
  const matchScore = computeMatchScore(resume, analysis);
  const primarySkill =
    analysis.must_have_skills[0] ?? analysis.keywords[0] ?? "key technologies";
  const toneLabel = TONE_LABELS[analysis.tone];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FAFAFA] text-on-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-outline-variant bg-surface px-md sm:px-lg">
        <span className="text-headline-page font-bold text-primary">
          Resume Optimiser
        </span>
      </header>

      <main className="mx-auto max-w-4xl px-md py-xl sm:px-lg">
        <button
          type="button"
          onClick={onBack}
          disabled={isTailoring}
          className="group mb-md flex items-center gap-xs text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
        >
          <ArrowLeft
            className="size-4 transition-transform group-hover:-translate-x-1"
            strokeWidth={2}
            aria-hidden
          />
          <span className="text-label-md">Back to editor</span>
        </button>

        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-soft md:flex-row">
          <div className="w-full border-b border-border bg-surface-container-low/50 p-lg md:w-1/3 md:border-b-0 md:border-r">
            <h1 className="mb-md text-headline-page text-on-surface">
              Job Description Analysis
            </h1>

            <div className="mb-xl">
              <div className="flex items-center gap-md">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-white p-sm">
                  <Sparkles
                    className="size-6 text-primary"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-headline-section text-on-surface">
                    {analysis.role_title}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    Target role
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-lg">
              <div>
                <h3 className="mb-sm text-label-caps text-on-surface-variant">
                  Seniority &amp; Tone
                </h3>
                <div className="flex flex-wrap gap-xs">
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-sm py-1 text-label-md text-primary">
                    <TrendingUp className="size-3.5" strokeWidth={2} aria-hidden />
                    {SENIORITY_LABELS[analysis.seniority]}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-sm py-1 text-label-md text-secondary">
                    <Terminal className="size-3.5" strokeWidth={2} aria-hidden />
                    {toneLabel}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="mb-sm text-label-caps text-on-surface-variant">
                  Match Potential
                </h3>
                <div className="flex items-end gap-xs">
                  <span className="text-display-lg font-bold leading-none text-secondary">
                    {matchScore}%
                  </span>
                  <span className="mb-1 text-label-md text-on-surface-variant">
                    Estimated
                  </span>
                </div>
                <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-500"
                    style={{ width: `${matchScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-lg">
            {analysis.must_have_skills.length > 0 ? (
              <div className="mb-xl">
                <div className="mb-md flex items-center gap-xs">
                  <BadgeCheck
                    className="size-5 text-[#B45309]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <h3 className="text-headline-section">Must-have Skills</h3>
                  <span className="ml-auto rounded bg-error-container px-xs py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-error-container">
                    High Importance
                  </span>
                </div>
                <div className="flex flex-wrap gap-sm">
                  {analysis.must_have_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-[#B45309]/30 bg-white px-md py-sm text-label-md text-[#B45309] shadow-soft"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {analysis.nice_to_have_skills.length > 0 ? (
              <div className="mb-xl">
                <h3 className="mb-md text-label-caps text-on-surface-variant">
                  Secondary Skills
                </h3>
                <div className="flex flex-wrap gap-sm">
                  {analysis.nice_to_have_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-surface-container-high px-md py-sm text-label-md text-on-surface-variant"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {analysis.keywords.length > 0 ? (
              <div className="mb-xl">
                <h3 className="mb-md text-label-caps text-on-surface-variant">
                  Strategic Keywords
                </h3>
                <div className="flex flex-wrap gap-sm">
                  {analysis.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-md border border-primary px-sm py-1 text-label-md text-primary"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {analysis.responsibilities.length > 0 ? (
              <div className="mb-xl">
                <h3 className="mb-md text-label-caps text-on-surface-variant">
                  Core Responsibilities
                </h3>
                <ul className="space-y-sm">
                  {analysis.responsibilities.map((item) => (
                    <li
                      key={item}
                      className="group flex items-start gap-md rounded-lg p-sm transition-colors hover:bg-surface-container-low"
                    >
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-secondary"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <p className="text-body-md text-on-surface-variant group-hover:text-on-surface">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-xxl border-t border-outline-variant pt-lg">
              <button
                type="button"
                onClick={onTailor}
                disabled={isTailoring}
                className="flex w-full items-center justify-center gap-md rounded-lg bg-primary py-md font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-on-primary-fixed-variant active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="size-5" strokeWidth={2} aria-hidden />
                {isTailoring
                  ? "Tailoring resume…"
                  : "Tailor Resume for This Role"}
              </button>
              <p className="mt-md flex items-center justify-center gap-xs text-center text-body-sm text-on-surface-variant">
                <Info className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Our AI will adjust your bullet points to emphasize these skills.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-lg grid grid-cols-1 gap-lg md:grid-cols-2">
          <div className="flex items-start gap-md rounded-xl border border-border bg-white p-lg">
            <div className="rounded-lg bg-tertiary-container/10 p-sm text-tertiary">
              <Lightbulb
                className="size-5"
                strokeWidth={2}
                fill="currentColor"
                fillOpacity={0.2}
                aria-hidden
              />
            </div>
            <div>
              <h4 className="mb-xs text-label-md text-on-surface">
                Optimization Tip
              </h4>
              <p className="text-body-sm text-on-surface-variant">
                Mention specific &ldquo;{primarySkill}&rdquo; implementation
                details in your latest role. Concrete tooling usage ranks higher
                than generic descriptions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-md rounded-xl border border-border bg-white p-lg">
            <div className="rounded-lg bg-secondary-container/10 p-sm text-secondary">
              <BadgeCheck
                className="size-5"
                strokeWidth={2}
                fill="currentColor"
                fillOpacity={0.15}
                aria-hidden
              />
            </div>
            <div>
              <h4 className="mb-xs text-label-md text-on-surface">
                Tone Verification
              </h4>
              <p className="text-body-sm text-on-surface-variant">
                The &ldquo;{toneLabel.replace(" tone", "")}&rdquo; tone matches
                this role&apos;s language. Tailoring will preserve that voice
                while aligning keywords.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
