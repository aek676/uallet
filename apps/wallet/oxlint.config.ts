import { defineConfig } from "oxlint";

import reactConfig from "@repo/oxlint-config/react";
import { bulletproofBoundaries } from "@repo/oxlint-config/react-app";

export default defineConfig({
  extends: [reactConfig, bulletproofBoundaries(import.meta.url)],
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/**",
    "src/app/route-tree.gen.ts",
    "src/paraglide/**",
  ],
  settings: {
    tailwindcss: { entryPoint: "src/styles.css" },
  },
  rules: {
    "no-restricted-globals": [
      "error",
      {
        name: "Bun",
        message: "The wallet runs in a browser: there is no Bun.",
      },
    ],
  },
});
