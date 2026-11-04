import { defineConfig } from "oxlint";

import reactConfig from "@repo/oxlint-config/react";

export default defineConfig({
  extends: [reactConfig],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
  overrides: [
    {
      // Generic `<Label>` wrapper: `htmlFor` / children come from the caller.
      files: ["src/components/label.tsx"],
      rules: {
        "jsx-a11y/label-has-associated-control": "off",
      },
    },
  ],
});
