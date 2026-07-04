"use client";

import {
  Download,
  FileText,
  FileUp,
  LayoutTemplate,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FormatterUploadZone } from "@/components/UploadZone/FormatterUploadZone";
import { UploadZone } from "@/components/UploadZone/UploadZone";

type LandingScreenProps = {
  mode: "tailor" | "format";
  error?: string | null;
  onFileSelected: (file: File) => void;
  onFormatSubmit: (resumeFile: File, templateFile: File) => void;
  onValidationError?: (message: string) => void;
};

export function LandingScreen({
  mode,
  error,
  onFileSelected,
  onFormatSubmit,
  onValidationError,
}: LandingScreenProps) {
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SiteHeader onGetStarted={scrollToUpload} />

      <main className="pt-xxxl">
        <section className="mx-auto max-w-[1280px] px-lg pb-xxl pt-xxxl text-center">
          <div className="mx-auto max-w-3xl space-y-md">
            <h1 className="text-display-lg tracking-tight text-on-background">
              {mode === "format"
                ? "Format your resume to match any template"
                : "Tailor your resume for every role — in minutes"}
            </h1>
            <p className="mx-auto max-w-2xl text-body-md text-on-surface-variant">
              {mode === "format"
                ? "Upload your resume and a template PDF. We map your existing content into the template fields — you fill the gaps, then download a matching PDF."
                : "Upload your existing resume. Paste a job description. Get an ATS-aligned, professionally formatted PDF — without rewriting from scratch."}
            </p>
          </div>

          <div className="mx-auto mt-lg flex max-w-md justify-center gap-sm">
            <Link
              href="/"
              className={`rounded-full px-md py-sm text-label-md transition-colors ${
                mode === "tailor"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Tailor for JD
            </Link>
            <Link
              href="/?mode=format"
              className={`rounded-full px-md py-sm text-label-md transition-colors ${
                mode === "format"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Format to template
            </Link>
          </div>

          <div ref={uploadSectionRef} id="upload" className="mt-xxl">
            {mode === "format" ? (
              <FormatterUploadZone
                error={error}
                onSubmit={onFormatSubmit}
                onValidationError={onValidationError}
              />
            ) : (
              <UploadZone
                error={error}
                onFileSelected={onFileSelected}
                onValidationError={onValidationError}
              />
            )}
          </div>
        </section>

        <section
          id="how-it-works"
          className="bg-surface-container-low py-xxxl"
        >
          <div className="mx-auto max-w-[1280px] px-lg">
            <div className="mb-xxl text-center">
              <h2 className="text-headline-page text-on-background">
                How it works
              </h2>
            </div>
            <div className="relative grid grid-cols-1 gap-xl md:grid-cols-3">
              {(mode === "format"
                ? [
                    {
                      step: 1,
                      icon: FileUp,
                      title: "Upload resume + template",
                      description:
                        "Provide your source resume and the target template PDF.",
                    },
                    {
                      step: 2,
                      icon: LayoutTemplate,
                      title: "Review mapped fields",
                      description:
                        "Auto-filled fields come from your resume; missing template fields stay blank.",
                    },
                    {
                      step: 3,
                      icon: Download,
                      title: "Download PDF",
                      description:
                        "Complete required fields and download a PDF that matches the template layout.",
                    },
                  ]
                : [
                    {
                      step: 1,
                      icon: FileUp,
                      title: "Upload resume",
                      description:
                        "Import your latest professional background in seconds.",
                    },
                    {
                      step: 2,
                      icon: FileText,
                      title: "Add job description",
                      description: "Paste the text of the role you're targeting.",
                    },
                    {
                      step: 3,
                      icon: Download,
                      title: "Download PDF",
                      description:
                        "Get your optimized, AI-enhanced resume instantly.",
                    },
                  ]
              ).map(({ step, icon: Icon, title, description }) => (
                <div
                  key={step}
                  className="relative z-10 flex flex-col items-center space-y-md text-center"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary font-bold text-white">
                    {step}
                  </div>
                  <div className="w-full rounded-md border border-outline-variant bg-white p-lg transition-shadow hover:shadow-soft">
                    <Icon
                      className="mb-sm size-6 text-primary"
                      strokeWidth={2}
                    />
                    <h3 className="mb-xs text-headline-section">{title}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-[1280px] px-lg py-xxxl"
        >
          <div className="grid grid-cols-1 gap-md md:grid-cols-4">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-md border border-outline-variant bg-white p-xl md:col-span-2">
              <div className="space-y-sm">
                <span className="rounded-full bg-secondary-container px-md py-1 text-label-caps text-on-secondary-container">
                  {mode === "format" ? "No fabrication" : "Smart Matching"}
                </span>
                <h3 className="text-headline-page">
                  {mode === "format"
                    ? "Map only what exists"
                    : "ATS Alignment"}
                </h3>
                <p className="text-body-md text-on-surface-variant">
                  {mode === "format"
                    ? "Content is mapped from your uploaded resume only. Missing template fields remain empty for you to complete manually."
                    : "We decode complex job descriptions to ensure your keywords match the recruiter's filter exactly."}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-md bg-on-background p-xl text-surface md:col-span-2">
              <div className="space-y-sm">
                <span className="rounded-full bg-primary-container px-md py-1 text-label-caps text-white">
                  Privacy First
                </span>
                <h3 className="text-headline-page text-white">
                  Browser-based Privacy
                </h3>
                <p className="text-body-md text-surface/70">
                  Your personal data never hits our permanent storage. All
                  processing happens within your current session.
                </p>
              </div>
              <div className="mt-xl flex items-center gap-md">
                <ShieldCheck
                  className="size-12 text-secondary"
                  strokeWidth={2}
                />
                <div className="text-label-md opacity-80">
                  Encrypted · Stateless · Secure
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter variant="landing" />
    </div>
  );
}
