import { existsSync, readdirSync } from "node:fs";

import { defineConfig, type OxlintConfig, type OxlintOverride } from "oxlint";

// oxlint resolves a bare plugin name from the app, so resolve it here and pass
// the full path: apps don't need eslint-plugin-check-file as a dependency.
const CHECK_FILE_PLUGIN = import.meta.resolve("eslint-plugin-check-file");

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

// `regex`, not `group`: gitignore-style groups treat a leading `#` as a comment.
// `(/|$)` also matches the bare path, e.g. `#/app` as well as `#/app/...`.
const NO_PARENT_IMPORTS = {
  regex: "(^|/)\\.\\.(/|$)",
  message: "Use `#/` imports instead of `../`.",
};
const NO_APP_IMPORTS = {
  regex: "^#/app(/|$)",
  message: "Only src/app can import from src/app.",
};
const NO_FEATURE_IMPORTS = {
  regex: "^#/features(/|$)",
  message: "Shared code can't import features. Compose them in src/app.",
};

type Pattern = { regex: string; message: string };

function restrict(patterns: Pattern[]): OxlintOverride["rules"] {
  return { "no-restricted-imports": ["error", { patterns }] };
}

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
  const featuresDir = new URL("src/features", configUrl);
  const features = existsSync(featuresDir)
    ? readdirSync(featuresDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  return defineConfig({
    overrides: [
      {
        files: ["src/**"],
        jsPlugins: [CHECK_FILE_PLUGIN],
        rules: {
          "check-file/folder-naming-convention": [
            "error",
            { "src/**/": "KEBAB_CASE" },
            { ignoreWords: ["__tests__"] },
          ],
        },
      },
      // Overrides replace the rule options, so each one lists all its patterns.
      { files: ["src/**"], rules: restrict([NO_PARENT_IMPORTS]) },
      {
        files: SHARED_DIRS.map((dir) => `src/${dir}/**`),
        rules: restrict([
          NO_PARENT_IMPORTS,
          NO_APP_IMPORTS,
          NO_FEATURE_IMPORTS,
        ]),
      },
      ...features.map((feature) => {
        const others = features.filter((other) => other !== feature);
        return {
          files: [`src/features/${feature}/**`],
          rules: restrict([
            NO_PARENT_IMPORTS,
            NO_APP_IMPORTS,
            ...(others.length > 0
              ? [
                  {
                    regex: `^#/features/(${others.map((other) => RegExp.escape(other)).join("|")})(/|$)`,
                    message:
                      "Features can't import other features. Compose them in src/app.",
                  },
                ]
              : []),
          ]),
        };
      }),
    ],
  });
}
