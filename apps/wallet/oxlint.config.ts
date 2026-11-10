import { defineConfig } from "oxlint";

import reactConfig from "@repo/oxlint-config/react";

export default defineConfig({
  extends: [reactConfig],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
});
