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
  PendingEditKind,
  ResumeSchema,
  VersionEntry,
} from "@/types/resume";

interface ResumeContextValue extends AppState {
  currentLabel: string;
  currentTimestamp: string;
  setResumeJson: (resume: ResumeSchema) => void;
  updateResumeJson: (resume: ResumeSchema) => void;
  setPendingEdit: (
    edit: PendingEdit | null,
    label?: string | null,
    kind?: PendingEditKind | null,
  ) => void;
  pendingEditLabel: string | null;
  acceptEdit: (label?: string, proposedResume?: ResumeSchema) => void;
  discardEdit: () => void;
}

const ResumeContext = createContext<ResumeContextValue | null>(null);

export function ResumeContextProvider({ children }: { children: ReactNode }) {
  const [resumeJson, setResumeJsonState] = useState<ResumeSchema | null>(null);
  const [versionStack, setVersionStack] = useState<VersionEntry[]>([]);
  const [pendingEdit, setPendingEditState] = useState<PendingEdit | null>(null);
  const [pendingEditLabel, setPendingEditLabel] = useState<string | null>(null);
  const [pendingEditKind, setPendingEditKind] =
    useState<PendingEditKind | null>(null);
  const [currentLabel, setCurrentLabel] = useState("Original parse");
  const [currentTimestamp, setCurrentTimestamp] = useState(() =>
    new Date().toISOString(),
  );

  const setResumeJson = useCallback((resume: ResumeSchema) => {
    setResumeJsonState(resume);
    setVersionStack([]);
    setPendingEditState(null);
    setPendingEditLabel(null);
    setPendingEditKind(null);
    setCurrentLabel("Original parse");
    setCurrentTimestamp(new Date().toISOString());
  }, []);

  const updateResumeJson = useCallback((resume: ResumeSchema) => {
    setResumeJsonState(resume);
  }, []);

  const setPendingEdit = useCallback(
    (
      edit: PendingEdit | null,
      label: string | null = null,
      kind: PendingEditKind | null = null,
    ) => {
      setPendingEditState(edit);
      setPendingEditLabel(label);
      setPendingEditKind(edit ? (kind ?? "tailor") : null);
    },
    [],
  );

  const acceptEdit = useCallback(
    (label?: string, proposedResume?: ResumeSchema) => {
      if (!pendingEdit || !resumeJson) {
        return;
      }

      const versionEntry: VersionEntry = {
        resumeJson,
        label: currentLabel,
        timestamp: currentTimestamp,
      };

      const nextLabel = label ?? pendingEditLabel ?? "Accepted edit";
      const nextResume =
        proposedResume ?? pendingEdit.proposedResumeJson;

      setVersionStack((current) => [...current, versionEntry]);
      setResumeJsonState(nextResume);
      setCurrentLabel(nextLabel);
      setCurrentTimestamp(new Date().toISOString());
      setPendingEditState(null);
      setPendingEditLabel(null);
      setPendingEditKind(null);
    },
    [currentLabel, currentTimestamp, pendingEdit, pendingEditLabel, resumeJson],
  );

  const discardEdit = useCallback(() => {
    setPendingEditState(null);
    setPendingEditLabel(null);
    setPendingEditKind(null);
  }, []);

  const value = useMemo<ResumeContextValue>(
    () => ({
      resumeJson,
      versionStack,
      pendingEdit,
      pendingEditKind,
      pendingEditLabel,
      currentLabel,
      currentTimestamp,
      setResumeJson,
      updateResumeJson,
      setPendingEdit,
      acceptEdit,
      discardEdit,
    }),
    [
      resumeJson,
      versionStack,
      pendingEdit,
      pendingEditKind,
      pendingEditLabel,
      currentLabel,
      currentTimestamp,
      setResumeJson,
      updateResumeJson,
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
