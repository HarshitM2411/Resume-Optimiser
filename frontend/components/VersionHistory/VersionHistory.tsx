"use client";

import { useEffect, useState } from "react";

import { useResume } from "@/app/context/ResumeContext";
import { formatRelativeTime } from "@/lib/relative-time";

export function VersionHistory() {
  const { versionStack, currentLabel, currentTimestamp } = useResume();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const history = [
    {
      key: "current",
      label: currentLabel,
      timestamp: currentTimestamp,
      active: true,
    },
    ...[...versionStack].reverse().map((entry, index) => ({
      key: `${entry.timestamp}-${index}`,
      label: entry.label,
      timestamp: entry.timestamp,
      active: false,
    })),
  ];

  const count = history.length;

  return (
    <aside className="flex h-full w-full flex-shrink-0 flex-col border-r border-outline-variant bg-surface lg:w-[240px]">
      <div className="flex items-center justify-between border-b border-outline-variant p-md">
        <h2 className="text-headline-section text-on-surface">Version History</h2>
        <span className="rounded-full bg-primary-container/10 px-2 py-0.5 text-[12px] font-bold text-primary">
          {count}
        </span>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-sm">
        {count === 0 ? (
          <p className="px-sm py-md text-body-sm text-on-surface-variant">
            No versions yet.
          </p>
        ) : (
          <div className="space-y-sm">
            {history.map((entry) => (
              <div
                key={entry.key}
                title="Preview only"
                className={
                  entry.active
                    ? "group relative cursor-help rounded-lg border border-primary/20 bg-primary-container/10 p-sm"
                    : "group relative cursor-help rounded-lg border border-transparent p-sm transition-colors hover:bg-surface-container"
                }
              >
                <span
                  className={
                    entry.active
                      ? "text-label-md font-bold leading-tight text-primary"
                      : "text-label-md font-medium leading-tight text-on-surface"
                  }
                >
                  {entry.label}
                </span>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {formatRelativeTime(entry.timestamp, now)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
