"use client";

import type { ReactNode } from "react";

interface SectionPanelProps {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
}

export function SectionPanel({ title, onEdit, children }: SectionPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {title}
        </h2>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Edit
          </button>
        ) : null}
      </div>
      <div className="text-sm text-slate-700">{children}</div>
    </section>
  );
}
