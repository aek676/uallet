import { defineConfig } from "oxlint";

import baseConfig from "@repo/oxlint-config/base";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
  overrides: [
    {
      files: ["src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                regex: "(^|/)\\.\\.(/|$)",
                message: "Use `#/` imports instead of `../`.",
              },
            ],
          },
        ],
      },
    },
  ],
});
