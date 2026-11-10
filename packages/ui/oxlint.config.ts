import { defineConfig } from "oxlint";

import reactConfig from "@repo/oxlint-config/react";

export default defineConfig({
  extends: [reactConfig],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
  settings: {
    tailwindcss: { entryPoint: "src/styles/globals.css" },
  },
  overrides: [
    {
      // Generic `<Label>` wrapper: `htmlFor` / children come from the caller.
      files: ["src/components/label.tsx"],
      rules: {
        "jsx-a11y/label-has-associated-control": "off",
      },
    },
    {
      // shadcn's `toaster` marker class has no CSS.
      files: ["src/components/sonner.tsx"],
      rules: {
        "tailwindcss/no-unknown-classes": ["error", { allowlist: ["toaster"] }],
      },
    },
  ],
});
