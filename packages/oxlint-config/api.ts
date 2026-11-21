import { defineConfig, type OxlintConfig } from "oxlint";

import baseConfig from "./base.ts";
import {
  KEBAB_CASE_FOLDERS,
  NO_PARENT_IMPORTS,
  noSiblingImports,
  type Pattern,
  restrict,
  subfolders,
} from "./lib/boundaries.ts";

export default defineConfig({
  extends: [baseConfig],
  plugins: ["typescript", "unicorn", "oxc", "import", "promise", "node"],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "error",
  },
  rules: {
    "oxc/no-async-endpoint-handlers": "off",

    "typescript/no-confusing-void-expression": "error",
    "typescript/no-deprecated": "error",
    "typescript/no-unnecessary-condition": "error",
    "typescript/prefer-nullish-coalescing": "error",
    "typescript/return-await": "error",
    "typescript/strict-boolean-expressions": [
      "error",
      { allowString: false, allowNumber: false },
    ],
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/use-unknown-in-catch-callback-variable": "error",

    eqeqeq: "error",
    "no-param-reassign": "error",
    "promise/no-return-wrap": "error",
    "promise/prefer-await-to-then": "error",
    "unicorn/error-message": "error",
    "unicorn/no-abusive-eslint-disable": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/throw-new-error": "error",
    "node/no-process-env": "error",
  },
  overrides: [
    {
      files: ["**/*.ts"],
      rules: {
        "typescript/no-non-null-assertion": "error",
      },
      env: {
        browser: false,
      },
    },
    {
      files: ["src/**"],
      rules: {
        "import/no-default-export": "error",
        "no-console": "error",
        "no-restricted-globals": [
          "error",
          {
            name: "Bun",
            message:
              "Only src/index.ts can use Bun APIs: the tests run the app under Node.",
          },
        ],
      },
    },
    {
      files: ["src/index.ts"],
      rules: {
        "no-restricted-globals": "off",
      },
    },
    {
      files: ["**/*.test.ts"],
      rules: {
        "vitest/consistent-test-it": "error",
        "vitest/no-conditional-in-test": "error",
        "vitest/prefer-strict-equal": "error",
      },
    },
  ],
});

const SHARED_DIRS = ["config", "lib", "plugins"];

const NO_INDEX_IMPORTS: Pattern = {
  regex: "^#/index$",
  message: "src/index.ts starts the server. Import the app from `#/app`.",
};
const NO_APP_IMPORTS: Pattern = {
  regex: "^#/app$",
  message:
    "Only src/index.ts and the tests in src import `#/app`. Compose routes in src/app.ts.",
};
const NO_ROUTE_IMPORTS: Pattern = {
  regex: "^#/routes(/|$)",
  message: "Shared code can't import routes. Compose them in src/app.ts.",
};
const NO_BUN_IMPORTS: Pattern = {
  regex: "^bun(:|$)",
  message:
    "Only src/index.ts can use Bun APIs: the tests run the app under Node (Vitest).",
};
const NO_TYPEBOX_IMPORTS: Pattern = {
  regex: "^@sinclair/typebox(/|$)",
  message: "Write schemas with `t` from `elysia`.",
};
const NO_VARLOCK_IMPORTS: Pattern = {
  regex: "^varlock(/|$)",
  message: "Read variables through `#/config/env`.",
};
const NO_ELYSIA_VALUES: Pattern = {
  regex: "^(elysia|@elysiajs/[^/]+|@elysia/[^/]+)(/|$)",
  allowTypeImports: true,
  message:
    "Services and src/lib don't depend on HTTP: return errors as values and map them to `status()` in the route.",
};

const EVERYWHERE = [
  NO_PARENT_IMPORTS,
  NO_INDEX_IMPORTS,
  NO_BUN_IMPORTS,
  NO_TYPEBOX_IMPORTS,
  NO_VARLOCK_IMPORTS,
];

export function apiBoundaries(configUrl: string): OxlintConfig {
  const features = subfolders(new URL("src/routes", configUrl));
  const shared = [...EVERYWHERE, NO_APP_IMPORTS, NO_ROUTE_IMPORTS];

  return defineConfig({
    overrides: [
      KEBAB_CASE_FOLDERS,
      { files: ["src/**"], rules: restrict(EVERYWHERE) },
      {
        files: SHARED_DIRS.map((dir) => `src/${dir}/**`),
        rules: restrict(shared),
      },
      { files: ["src/lib/**"], rules: restrict([...shared, NO_ELYSIA_VALUES]) },
      {
        files: ["src/config/env.ts"],
        rules: restrict(
          shared.filter((pattern) => pattern !== NO_VARLOCK_IMPORTS),
        ),
      },
      ...features.flatMap((feature) => {
        const featurePatterns = [
          ...EVERYWHERE,
          NO_APP_IMPORTS,
          ...noSiblingImports(
            "routes",
            features.filter((other) => other !== feature),
            "Route features can't import each other. Move shared code to src/lib, or compose in src/app.ts.",
          ),
        ];
        return [
          {
            files: [`src/routes/${feature}/**`],
            rules: restrict(featurePatterns),
          },
          {
            files: [`src/routes/${feature}/service.ts`],
            rules: restrict([...featurePatterns, NO_ELYSIA_VALUES]),
          },
        ];
      }),
      {
        files: ["src/index.ts"],
        rules: restrict([NO_PARENT_IMPORTS, NO_TYPEBOX_IMPORTS]),
      },
    ],
  });
}
