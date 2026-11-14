import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  ignorePatterns: [
    "aube-lock.yaml",
    "apps/*/env.d.ts",
    "apps/*/src/app/route-tree.gen.ts",
    "apps/*/src/paraglide/**",
  ],
  sortImports: {
    internalPattern: ["@repo/"],
    groups: [
      "builtin",
      "external",
      "internal",
      "subpath",
      ["parent", "sibling", "index"],
      "style",
      "unknown",
    ],
  },
  sortTailwindcss: {
    stylesheet: "./packages/ui/src/styles/globals.css",
    functions: ["cn", "cva"],
  },
});
