"use client";

import type { ReactNode } from "react";

import { FormatterContextProvider } from "@/app/context/FormatterContext";
import { ResumeContextProvider } from "@/app/context/ResumeContext";
import { ToastProvider } from "@/app/context/ToastContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ResumeContextProvider>
        <FormatterContextProvider>{children}</FormatterContextProvider>
      </ResumeContextProvider>
    </ToastProvider>
  );
}
