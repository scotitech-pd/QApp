"use client";

import type { ReactNode } from "react";

import { AppChrome } from "./components/app-chrome";
import { AuthProvider } from "./lib/auth";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppChrome>{children}</AppChrome>
    </AuthProvider>
  );
}
