import { defineConfig, type OxlintConfig } from "oxlint";

import {
  KEBAB_CASE_FOLDERS,
  NO_PARENT_IMPORTS,
  noSiblingImports,
  restrict,
  subfolders,
} from "./lib/boundaries.ts";

const SHARED_DIRS = [
  "assets",
  "components",
  "config",
  "hooks",
  "lib",
  "stores",
  "testing",
  "types",
  "utils",
];

const NO_APP_IMPORTS = {
  regex: "^#/app(/|$)",
  message: "Only src/app can import from src/app.",
};
const NO_FEATURE_IMPORTS = {
  regex: "^#/features(/|$)",
  message: "Shared code can't import features. Compose them in src/app.",
};

/**
 * bulletproof-react boundaries: shared code -> features -> app.
 *
 * - Shared folders can't import features or app.
 * - A feature can't import app or other features.
 * - No `../` imports anywhere, so relative paths can't bypass the rules.
 * - Folders in `src` are kebab-case, except `__tests__`.
 *
 * Pass the app config's `import.meta.url`; features are read from
 * `src/features`. Add the result to the app's `extends`: `files` globs are
 * relative to the config that extends it.
 */
export function bulletproofBoundaries(configUrl: string): OxlintConfig {
  const features = subfolders(new URL("src/features", configUrl));

  return defineConfig({
    overrides: [
      KEBAB_CASE_FOLDERS,
      { files: ["src/**"], rules: restrict([NO_PARENT_IMPORTS]) },
      {
        files: SHARED_DIRS.map((dir) => `src/${dir}/**`),
        rules: restrict([
          NO_PARENT_IMPORTS,
          NO_APP_IMPORTS,
          NO_FEATURE_IMPORTS,
        ]),
      },
      ...features.map((feature) => ({
        files: [`src/features/${feature}/**`],
        rules: restrict([
          NO_PARENT_IMPORTS,
          NO_APP_IMPORTS,
          ...noSiblingImports(
            "features",
            features.filter((other) => other !== feature),
            "Features can't import other features. Compose them in src/app.",
          ),
        ]),
      })),
    ],
  });
}
