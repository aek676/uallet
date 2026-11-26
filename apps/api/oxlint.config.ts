import { defineConfig } from "oxlint";

import apiConfig, { apiBoundaries } from "@repo/oxlint-config/api";

export default defineConfig({
  extends: [apiConfig, apiBoundaries(import.meta.url)],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
});
