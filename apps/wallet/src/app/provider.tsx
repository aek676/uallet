import { Web3AuthProvider } from "@web3auth/no-modal/react";
import { SolanaProvider } from "@web3auth/no-modal/react/solana";
import type { ReactNode } from "react";

import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";

import { web3AuthConfig } from "#/lib/web3auth";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Web3AuthProvider config={web3AuthConfig}>
        <SolanaProvider>{children}</SolanaProvider>
      </Web3AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}
