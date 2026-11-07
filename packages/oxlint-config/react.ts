import { defineConfig } from "oxlint";
import tailwindcss from "oxlint-tailwindcss/config";

import baseConfig from "./base.ts";

export default defineConfig({
  extends: [baseConfig, tailwindcss()],
  plugins: ["typescript", "unicorn", "oxc", "import", "react", "jsx-a11y"],
  rules: {
    // In `suspicious` (warn); not needed with the automatic JSX runtime (`jsx: "react-jsx"`).
    "react/react-in-jsx-scope": "off",

    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    "react/jsx-no-target-blank": "error",
    "react/self-closing-comp": "error",
    "react/no-unescaped-entities": "error",

    // oxfmt already sorts classes (`sortTailwindcss`).
    "tailwindcss/enforce-sort-order": "off",
  },
  overrides: [
    {
      files: ["**/*.tsx"],
      rules: {
        "typescript/no-non-null-assertion": "off",
      },
      env: {
        browser: true,
      },
    },
  ],
});
