import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  ignorePatterns: ["aube-lock.yaml"],
  sortImports: {
    internalPattern: ["@repo/"],
  },
});
