import type { ReactNode } from "react";

import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
