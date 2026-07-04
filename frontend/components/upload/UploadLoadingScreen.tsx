"use client";

import { BadgeCheck, Brain, Check, FileText, Target, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

const STEPS = [
  { id: "uploaded", label: "Document uploaded" },
  { id: "scanning", label: "Scanning structure" },
  { id: "matching", label: "Generating match score" },
] as const;

type UploadLoadingScreenProps = {
  fileName?: string;
};

export function UploadLoadingScreen({ fileName }: UploadLoadingScreenProps) {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setActiveStep(1), 0),
      window.setTimeout(() => setActiveStep(2), 1800),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader activeNav="features" />

      <main className="mx-auto max-w-[1280px] px-lg pb-xxl pt-xxxl">
        <section className="mt-xxl flex flex-col items-center text-center">
          <div className="mb-lg inline-flex animate-fade-in-up items-center gap-xs rounded-full border border-secondary/20 bg-secondary-container/30 px-md py-1">
            <BadgeCheck className="size-4 text-secondary" strokeWidth={2} />
            <span className="text-label-caps text-on-secondary-container">
              AI-Powered Optimization
            </span>
          </div>

          <h1
            className="mb-md max-w-2xl animate-fade-in-up text-display-lg text-on-surface opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            Optimize Your Resume for the Modern Job Market
          </h1>
          <p
            className="mb-xxl max-w-xl animate-fade-in-up text-body-md text-on-surface-variant opacity-0"
            style={{ animationDelay: "0.2s" }}
          >
            Our surgical AI analyzes your professional background against job
            descriptions to help you land interviews faster. Reliability meets
            efficiency.
          </p>

          <div
            className="relative w-full max-w-4xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex min-h-[480px] flex-col overflow-hidden rounded-md border border-outline-variant bg-white shadow-overlay md:flex-row">
              <div className="w-full border-r border-outline-variant bg-surface-container-low p-lg opacity-40 md:w-1/2">
                <div className="mb-lg flex items-center justify-between">
                  <h3 className="text-headline-section text-on-surface">
                    Input Data
                  </h3>
                  <div className="h-6 w-16 rounded bg-surface-variant" />
                </div>
                <div className="space-y-md">
                  <div className="h-4 w-3/4 rounded bg-surface-variant" />
                  <div className="h-4 w-full rounded bg-surface-variant" />
                  <div className="h-4 w-5/6 rounded bg-surface-variant" />
                  <div className="h-4 w-2/3 rounded bg-surface-variant" />
                  {fileName ? (
                    <p className="truncate pt-sm text-left text-body-sm text-on-surface-variant">
                      {fileName}
                    </p>
                  ) : null}
                  <div className="mt-lg space-y-md border-t border-outline-variant pt-lg">
                    <div className="h-4 w-full rounded bg-surface-variant" />
                    <div className="h-4 w-3/4 rounded bg-surface-variant" />
                  </div>
                </div>
              </div>

              <div className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-surface p-lg md:w-1/2">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "radial-gradient(#3525cd 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative mb-xl size-24">
                    <div className="absolute inset-0 rounded-full border-4 border-primary-container/20" />
                    <div className="absolute inset-0 animate-spin-border rounded-full border-4 border-primary border-t-transparent shadow-[0_0_15px_rgba(53,37,205,0.2)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="size-8 text-primary" strokeWidth={2} />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="mb-xs text-headline-section text-on-surface">
                      Parsing your resume…
                    </h3>
                    <p className="mb-lg text-body-sm text-on-surface-variant">
                      Our AI is extracting key skills and experiences
                    </p>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-xxxl grid grid-cols-1 gap-lg md:grid-cols-3">
          {[
            {
              icon: Target,
              iconClass: "text-primary",
              title: "Keyword Alignment",
              description:
                "Identify the exact industry keywords recruiters are searching for in your specific field.",
            },
            {
              icon: FileText,
              iconClass: "text-secondary",
              title: "ATS Optimization",
              description:
                "Ensure your resume passes through Applicant Tracking Systems without being filtered out.",
            },
            {
              icon: Zap,
              iconClass: "text-tertiary-container",
              title: "Instant Refinement",
              description:
                "Receive surgical AI suggestions to rewrite bullet points for maximum professional impact.",
            },
          ].map(({ icon: Icon, iconClass, title, description }) => (
            <div
              key={title}
              className="rounded-md border border-outline-variant bg-surface-container p-lg transition-all hover:shadow-soft"
            >
              <Icon className={`mb-md size-6 ${iconClass}`} strokeWidth={2} />
              <h4 className="mb-sm text-headline-section text-on-surface">
                {title}
              </h4>
              <p className="text-body-sm text-on-surface-variant">
                {description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <SiteFooter variant="loading" />
    </div>
  );
}
