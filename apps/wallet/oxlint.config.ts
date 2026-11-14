import { defineConfig } from "oxlint";

import reactConfig from "@repo/oxlint-config/react";
import { bulletproofBoundaries } from "@repo/oxlint-config/react-app";

export default defineConfig({
  extends: [reactConfig, bulletproofBoundaries(import.meta.url)],
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/**",
    "src/app/route-tree.gen.ts",
  ],
  settings: {
    tailwindcss: { entryPoint: "src/styles.css" },
  },
});
