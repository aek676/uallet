import { ClientProvider } from "@solana/react";
import type { ReactNode } from "react";

import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";

import { solanaClient } from "#/lib/solana-client";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ClientProvider client={solanaClient}>{children}</ClientProvider>
      <Toaster />
    </ThemeProvider>
  );
}
