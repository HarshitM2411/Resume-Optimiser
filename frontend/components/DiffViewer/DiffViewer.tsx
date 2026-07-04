"use client";

import { useResume } from "@/app/context/ResumeContext";
import { formatDiffValue } from "@/lib/diff";

export function DiffViewer() {
  const { pendingEdit, acceptEdit, discardEdit, pendingEditLabel } = useResume();

  if (!pendingEdit) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Review Changes</h2>
          <p className="text-sm text-slate-500">
            Accept to save this version, or discard to keep your current resume.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-auto px-6 py-4">
          {pendingEdit.diff.length === 0 ? (
            <p className="text-sm text-slate-500">No diff items returned.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700">Section</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Before</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">After</th>
                </tr>
              </thead>
              <tbody>
                {pendingEdit.diff.map((item, index) => (
                  <tr key={`${item.section}-${index}`} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {item.section}
                    </td>
                    <td className="px-3 py-3 whitespace-pre-wrap text-slate-700">
                      {formatDiffValue(item.before)}
                    </td>
                    <td className="px-3 py-3 whitespace-pre-wrap text-slate-900">
                      {formatDiffValue(item.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={discardEdit}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => acceptEdit(pendingEditLabel ?? undefined)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Accept Changes
          </button>
        </div>
      </div>
    </div>
  );
}
