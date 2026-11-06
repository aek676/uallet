import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  ignorePatterns: ["aube-lock.yaml"],
  sortImports: {
    // Workspace packages. `#` imports are matched by the `subpath` selector.
    internalPattern: ["@repo/"],
    groups: [
      "builtin",
      "external",
      // @repo/*
      "internal",
      // #/... (package.json `imports`)
      "subpath",
      ["parent", "sibling", "index"],
      "style",
      "unknown",
    ],
  },
  sortTailwindcss: {
    // Tailwind v4: the stylesheet with the design tokens and `@theme`.
    stylesheet: "./packages/ui/src/styles/globals.css",
    // Also sort classes passed to these helpers.
    functions: ["cn", "cva"],
  },
});
