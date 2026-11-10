import { ClientProvider } from "@solana/react";
import { Web3AuthProvider } from "@web3auth/no-modal/react";
import type { ReactNode } from "react";

import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";

import { solanaClient } from "#/lib/solana-client";
import { web3AuthConfig } from "#/lib/web3auth";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Web3AuthProvider config={web3AuthConfig}>
        <ClientProvider client={solanaClient}>{children}</ClientProvider>
      </Web3AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}
