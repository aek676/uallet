import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "oxc", "import"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  env: {
    builtin: true,
  },
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
  rules: {
    // In `suspicious` (warn); promoted to errors.
    "preserve-caught-error": "error",
    "typescript/no-unnecessary-type-constraint": "error",
    "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],

    // Not in any enabled category.
    "import/no-cycle": "error",
    "import/no-duplicates": "error",
    "oxc/no-barrel-file": ["error", { threshold: 0 }],
    "unicorn/filename-case": ["error", { case: "kebabCase" }],
    "no-array-constructor": "error",
    "no-case-declarations": "error",
    "no-empty": "error",
    "no-fallthrough": "error",
    "no-prototype-builtins": "error",
    "no-redeclare": "error",
    "no-regex-spaces": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-namespace": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-unsafe-function-type": "error",

    // Type-aware rules from typescript-eslint's `recommended-type-checked`.
    // They only run with `oxlint --type-aware`, which requires `oxlint-tsgolint`.
    // In `suspicious` (warn); promoted to errors.
    "typescript/no-implied-eval": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unsafe-enum-comparison": "error",
    // Not in any enabled category.
    "typescript/no-misused-promises": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/only-throw-error": "error",
    "typescript/prefer-promise-reject-errors": "error",
    "typescript/require-await": "error",
    "typescript/restrict-plus-operands": "error",
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      rules: {
        "constructor-super": "off",
        "getter-return": "off",
        "no-class-assign": "off",
        "no-const-assign": "off",
        "no-dupe-class-members": "off",
        "no-dupe-keys": "off",
        "no-func-assign": "off",
        "no-import-assign": "off",
        "no-new-native-nonconstructor": "off",
        "no-obj-calls": "off",
        "no-redeclare": "off",
        "no-setter-return": "off",
        "no-this-before-super": "off",
        "no-unreachable": "off",
        "no-unsafe-negation": "off",
        "no-var": "error",
        "no-with": "off",
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error",
      },
    },
    {
      files: ["**/*.ts"],
      rules: {
        "typescript/no-non-null-assertion": "off",
      },
      env: {
        browser: true,
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      plugins: ["vitest"],
      rules: {
        "vitest/no-identical-title": "error",
        "vitest/no-import-node-test": "error",
        "vitest/no-interpolation-in-snapshots": "error",
        "vitest/no-mocks-import": "error",
        "vitest/no-unneeded-async-expect-function": "error",
        "vitest/prefer-called-exactly-once-with": "error",
      },
    },
  ],
});
