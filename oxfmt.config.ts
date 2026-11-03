import { defineConfig } from "oxfmt";

export default defineConfig({
  // Keep Prettier's default (Oxfmt defaults to 100).
  printWidth: 80,
  sortImports: {
    // Treat workspace packages as internal imports.
    internalPattern: ["@repo/"],
  },
});
