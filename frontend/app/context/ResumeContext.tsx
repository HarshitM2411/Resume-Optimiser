"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AppState,
  PendingEdit,
  ResumeSchema,
  VersionEntry,
} from "@/types/resume";

interface ResumeContextValue extends AppState {
  setResumeJson: (resume: ResumeSchema) => void;
  setPendingEdit: (edit: PendingEdit | null, label?: string | null) => void;
  pendingEditLabel: string | null;
  acceptEdit: (label?: string) => void;
  discardEdit: () => void;
}

const ResumeContext = createContext<ResumeContextValue | null>(null);

export function ResumeContextProvider({ children }: { children: ReactNode }) {
  const [resumeJson, setResumeJson] = useState<ResumeSchema | null>(null);
  const [versionStack, setVersionStack] = useState<VersionEntry[]>([]);
  const [pendingEdit, setPendingEditState] = useState<PendingEdit | null>(null);
  const [pendingEditLabel, setPendingEditLabel] = useState<string | null>(null);

  const setPendingEdit = useCallback(
    (edit: PendingEdit | null, label: string | null = null) => {
      setPendingEditState(edit);
      setPendingEditLabel(label);
    },
    [],
  );

  const acceptEdit = useCallback(
    (label?: string) => {
      if (!pendingEdit || !resumeJson) {
        return;
      }

      const versionLabel = label ?? pendingEditLabel ?? "Accepted edit";
      const versionEntry: VersionEntry = {
        resumeJson,
        label: versionLabel,
        timestamp: new Date().toISOString(),
      };

      setVersionStack((current) => [...current, versionEntry]);
      setResumeJson(pendingEdit.proposedResumeJson);
      setPendingEdit(null);
    },
    [pendingEdit, pendingEditLabel, resumeJson, setPendingEdit],
  );

  const discardEdit = useCallback(() => {
    setPendingEdit(null);
  }, [setPendingEdit]);

  const value = useMemo<ResumeContextValue>(
    () => ({
      resumeJson,
      versionStack,
      pendingEdit,
      pendingEditLabel,
      setResumeJson,
      setPendingEdit,
      acceptEdit,
      discardEdit,
    }),
    [
      resumeJson,
      versionStack,
      pendingEdit,
      pendingEditLabel,
      acceptEdit,
      discardEdit,
      setPendingEdit,
    ],
  );

  return (
    <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error("useResume must be used within ResumeContextProvider");
  }
  return context;
}
