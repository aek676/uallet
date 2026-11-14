import { defineConfig } from "@inlang/paraglide-js";

export default defineConfig({
  outdir: "./src/paraglide",
  emitTsDeclarations: true,
  // A language picked in the app, else the browser's, else English.
  strategy: ["localStorage", "preferredLanguage", "baseLocale"],
  localStorageKey: "uallet:merchant:locale",
});
