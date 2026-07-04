"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  {
    id: "analyze",
    label: "Analyzing job description",
    completedLabel: "Completed",
  },
  {
    id: "compare",
    label: "Comparing against your experience",
    activeLabel: "In progress",
  },
  {
    id: "generate",
    label: "Generating tailored version",
    pendingLabel: "Pending",
  },
] as const;

const TIPS = [
  "Highlighting quantifiable achievements increases recruiter engagement by 40%.",
  "Lead with impact verbs and outcomes — recruiters scan for results first.",
  "Mirror the job description’s language so ATS systems recognize your fit.",
];

export function TailoringInProgress() {
  const [activeStep, setActiveStep] = useState(0);
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setActiveStep(1), 2200),
      window.setTimeout(() => setActiveStep(2), 5200),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#FAFAFA]">
      <header className="fixed left-1/2 top-0 z-50 flex h-xxxl w-full max-w-[1280px] -translate-x-1/2 items-center justify-between border-b border-outline-variant bg-transparent px-lg">
        <span className="text-headline-page font-bold text-primary">
          Resume Optimiser
        </span>
      </header>

      <main className="relative flex h-screen w-full flex-col items-center justify-center px-md">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#3525cd 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 w-full max-w-lg space-y-xl text-center">
          <div className="mb-xl flex justify-center">
            <div className="relative size-24">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/10 rotate-6" />
              <div
                className="absolute inset-0 animate-pulse rounded-2xl bg-primary/5 -rotate-6"
                style={{ animationDelay: "1s" }}
              />
              <div className="relative flex size-full items-center justify-center rounded-2xl border border-outline-variant bg-surface shadow-soft">
                <Sparkles
                  className="size-10 text-primary"
                  strokeWidth={2}
                  fill="currentColor"
                  fillOpacity={0.15}
                />
              </div>
            </div>
          </div>

          <div className="space-y-sm">
            <h1 className="text-headline-page font-bold tracking-tight text-on-background">
              Tailoring your resume…
            </h1>
            <p className="mx-auto max-w-sm text-body-md text-on-surface-variant">
              Our AI is meticulously aligning your skills with the job
              requirements to maximize your match score.
            </p>
          </div>

          <div className="mx-auto max-w-md space-y-md rounded-xl border border-outline-variant bg-white p-lg text-left shadow-soft">
            {STEPS.map((step, index) => {
              const isComplete = index < activeStep;
              const isActive = index === activeStep;
              const isPending = index > activeStep;

              return (
                <div key={step.id}>
                  <div
                    className={`flex items-center gap-md transition-all duration-500 ${
                      isPending ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center">
                      {isComplete ? (
                        <div className="flex size-8 items-center justify-center rounded-full bg-secondary-container">
                          <Check
                            className="size-4 text-on-secondary-container"
                            strokeWidth={2.5}
                          />
                        </div>
                      ) : isActive ? (
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary-fixed">
                          <div className="size-[18px] animate-spin rounded-full border-2 border-primary/10 border-l-primary" />
                        </div>
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full border-2 border-outline">
                          <span className="size-2 rounded-full bg-outline" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-label-md text-on-surface">
                        {step.label}
                      </p>
                      {isComplete ? (
                        <p className="text-body-sm font-medium text-secondary">
                          Completed
                        </p>
                      ) : isActive ? (
                        <p className="text-body-sm font-medium text-primary">
                          <span className="inline-block animate-pulse">
                            In progress
                          </span>
                        </p>
                      ) : (
                        <p className="text-body-sm text-on-surface-variant">
                          Pending
                        </p>
                      )}
                    </div>
                  </div>

                  {index < STEPS.length - 1 ? (
                    <div className="ml-4 h-6 border-l-2 border-dashed border-outline-variant" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="w-full border-t border-outline-variant pt-xl">
            <p className="text-body-sm italic text-on-surface-variant">
              &ldquo;Tip: {TIPS[tipIndex]}&rdquo;
            </p>
          </div>
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-0 left-0 z-0 h-xxxl w-full overflow-hidden">
        <div className="absolute bottom-0 left-1/2 h-px w-[1280px] -translate-x-1/2 bg-gradient-to-r from-transparent via-outline-variant to-transparent" />
      </div>
    </div>
  );
}
