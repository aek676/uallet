import { existsSync, readdirSync } from "node:fs";

import type { OxlintOverride } from "oxlint";

export const CHECK_FILE_PLUGIN = import.meta
  .resolve("eslint-plugin-check-file");

export type Pattern = {
  regex: string;
  message: string;
  allowTypeImports?: boolean;
  importNames?: string[];
};

export const NO_PARENT_IMPORTS: Pattern = {
  regex: "(^|/)\\.\\.(/|$)",
  message: "Use `#/` imports instead of `../`.",
};

export function restrict(patterns: Pattern[]): OxlintOverride["rules"] {
  return { "no-restricted-imports": ["error", { patterns }] };
}

export function subfolders(dir: URL): string[] {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];
}

export function noSiblingImports(
  parent: string,
  others: string[],
  message: string,
): Pattern[] {
  return others.length > 0
    ? [
        {
          regex: `^#/${parent}/(${others.map((other) => RegExp.escape(other)).join("|")})(/|$)`,
          message,
        },
      ]
    : [];
}

export const KEBAB_CASE_FOLDERS: OxlintOverride = {
  files: ["src/**"],
  jsPlugins: [CHECK_FILE_PLUGIN],
  rules: {
    "check-file/folder-naming-convention": [
      "error",
      { "src/**/": "KEBAB_CASE" },
      { ignoreWords: ["__tests__"] },
    ],
  },
};
