"use client";

import type { ReactNode } from "react";

import { ResumeContextProvider } from "@/app/context/ResumeContext";
import { ToastProvider } from "@/app/context/ToastContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ResumeContextProvider>{children}</ResumeContextProvider>
    </ToastProvider>
  );
}
