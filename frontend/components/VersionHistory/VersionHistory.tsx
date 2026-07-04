"use client";

import { useResume } from "@/app/context/ResumeContext";

export function VersionHistory() {
  const { versionStack } = useResume();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
        Version History
      </h2>
      {versionStack.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No accepted edits yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versionStack.map((entry, index) => (
            <li
              key={`${entry.timestamp}-${index}`}
              className="rounded-md border border-slate-100 px-3 py-2 text-sm"
            >
              <p className="font-medium text-slate-800">{entry.label}</p>
              <p className="text-xs text-slate-500">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
