"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { FormatterState, TemplateFormData, TemplateSchema } from "@/types/template";

interface FormatterContextValue extends FormatterState {
  setFormatterResult: (
    templateSchema: TemplateSchema,
    formData: TemplateFormData,
  ) => void;
  updateFormData: (formData: TemplateFormData) => void;
  clearFormatter: () => void;
}

const FormatterContext = createContext<FormatterContextValue | null>(null);

export function FormatterContextProvider({ children }: { children: ReactNode }) {
  const [templateSchema, setTemplateSchema] = useState<TemplateSchema | null>(
    null,
  );
  const [formData, setFormData] = useState<TemplateFormData | null>(null);

  const setFormatterResult = useCallback(
    (schema: TemplateSchema, data: TemplateFormData) => {
      setTemplateSchema(schema);
      setFormData(data);
    },
    [],
  );

  const updateFormData = useCallback((data: TemplateFormData) => {
    setFormData(data);
  }, []);

  const clearFormatter = useCallback(() => {
    setTemplateSchema(null);
    setFormData(null);
  }, []);

  const value = useMemo<FormatterContextValue>(
    () => ({
      templateSchema,
      formData,
      setFormatterResult,
      updateFormData,
      clearFormatter,
    }),
    [templateSchema, formData, setFormatterResult, updateFormData, clearFormatter],
  );

  return (
    <FormatterContext.Provider value={value}>{children}</FormatterContext.Provider>
  );
}

export function useFormatter() {
  const context = useContext(FormatterContext);
  if (!context) {
    throw new Error("useFormatter must be used within FormatterContextProvider");
  }
  return context;
}
