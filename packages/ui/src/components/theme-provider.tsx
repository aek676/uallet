import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

import { TooltipProvider } from "#components/tooltip";

/**
 * App-wide providers for the design system: light/dark theme (stored in
 * `localStorage["theme"]`, toggles the `.dark` class on `<html>`) and tooltips.
 */
function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}

export { ThemeProvider };
