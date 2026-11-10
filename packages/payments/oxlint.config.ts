import { defineConfig } from "oxlint";

import baseConfig from "@repo/oxlint-config";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
});
