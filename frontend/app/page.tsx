import { UploadZone } from "@/components/UploadZone/UploadZone";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Resume Optimiser
      </h1>
      <p className="mt-3 text-center text-slate-600">
        Upload your resume, tailor it to a job description, edit sections, and
        download a polished PDF.
      </p>
      <div className="mt-8 w-full">
        <UploadZone />
      </div>
    </main>
  );
}
