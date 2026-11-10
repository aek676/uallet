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
      // next-themes renders an inline <script> meant for server rendering.
      // Our apps are client-only, where React 19 never runs it and warns.
      // A data-block type silences the warning; next-themes still applies the
      // theme from its own effect.
      scriptProps={{ type: "application/json" }}
    >
      <TooltipProvider>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}

export { ThemeProvider };
