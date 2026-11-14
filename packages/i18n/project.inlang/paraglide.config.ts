import { defineConfig } from "@inlang/paraglide-js";

/**
 * Shared by every app that compiles this project. `outdir` is relative to the
 * app compiling it (Vite's root, or where `codegen` runs).
 */
export default defineConfig({
  outdir: "./src/paraglide",
  emitTsDeclarations: true,
  // A language picked in the app, else the browser's, else English.
  strategy: ["localStorage", "preferredLanguage", "baseLocale"],
  // Per origin: apps on different origins keep their own choice.
  localStorageKey: "uallet:locale",
});
