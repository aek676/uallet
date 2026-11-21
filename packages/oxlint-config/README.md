# `@repo/oxlint-config`

Shared [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration for the monorepo.

## Usage

Add `@repo/oxlint-config`, `oxlint` and `oxlint-tsgolint` as dev dependencies of the workspace, set its `lint` script to `oxlint --type-aware --type-check` and its `lint:fix` script to `oxlint --type-aware --type-check --fix`, and create an `oxlint.config.ts` (use `oxlint.config.mts` if the package has no `"type": "module"`):

```ts
import { defineConfig } from "oxlint";

import baseConfig from "@repo/oxlint-config/base";

export default defineConfig({
  extends: [baseConfig],
});
```

## Configs

- `@repo/oxlint-config/base`: any TypeScript workspace.
- `@repo/oxlint-config/react`: React workspaces. Extends `base` and the [`oxlint-tailwindcss`](https://oxlint-tailwindcss.pages.dev) recommended rules (class order is left to oxfmt). Set the CSS entry point in the workspace's own config, since oxlint drops `settings` from extended configs:

```ts
settings: {
  tailwindcss: { entryPoint: "src/styles/globals.css" },
},
```

Apps that use the `@repo/ui` design system have their own entry point, `src/styles.css`, which imports it (`@import "@repo/ui/globals.css";`), so the path stays local to the workspace.

- `@repo/oxlint-config/react-app`: `bulletproofBoundaries()` for React apps organized like [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) (`src/app`, `src/features`, shared folders). Enforces shared → features → app, forbids `../` imports and requires kebab-case folders in `src` (except `__tests__`, via `eslint-plugin-check-file` as an oxlint JS plugin). Add it to the app's `extends`:

```ts
import { defineConfig } from "oxlint";

import reactConfig from "@repo/oxlint-config/react";
import { bulletproofBoundaries } from "@repo/oxlint-config/react-app";

export default defineConfig({
  extends: [reactConfig, bulletproofBoundaries(import.meta.url)],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
  settings: {
    tailwindcss: { entryPoint: "src/styles.css" },
  },
});
```

- `@repo/oxlint-config/api`: the Elysia API on Bun ([`apps/api`](../../apps/api/README.md)). Its default export extends `base` with stricter rules: `correctness`, `suspicious` and `perf` are errors, plus the `promise` and `node` plugins and extra type-aware rules (`strict-boolean-expressions`, `no-unnecessary-condition`, `switch-exhaustiveness-check`, no `!`, ...). In `src`, no `export default`, and `console` and `Bun` only in `src/index.ts`. `oxc/no-async-endpoint-handlers` is off: it's for Express. `apiBoundaries()` adds the folder boundaries: shared (`config`, `lib`, `plugins`) → `src/routes/<name>` → `src/app.ts` → `src/index.ts`, services and `src/lib` import only types from Elysia, `bun` / `bun:*` only in `src/index.ts`, `varlock/env` only in `src/config/env.ts`, no `@sinclair/typebox`, no `../`, kebab-case folders. Add both to the API's `extends`, and add `--deny-warnings --report-unused-disable-directives-severity=error` to its `lint` and `lint:fix` scripts:

```ts
import { defineConfig } from "oxlint";

import apiConfig, { apiBoundaries } from "@repo/oxlint-config/api";

export default defineConfig({
  extends: [apiConfig, apiBoundaries(import.meta.url)],
  ignorePatterns: ["**/dist/**", "**/node_modules/**"],
});
```

`bulletproofBoundaries()` and `apiBoundaries()` share their helpers ([`lib/boundaries.ts`](lib/boundaries.ts)). Both read the feature folders when the config loads: after adding one, restart the editor's language server.

## Notes

- TypeScript config files require Node.js >= 22.18.
- Type-aware rules (`typescript/no-floating-promises`, ...) only run with `--type-aware`. `--type-check` also reports TypeScript compiler errors, [replacing a separate `tsc --noEmit` step](https://oxc.rs/docs/guide/usage/linter/type-aware.html#type-checking-diagnostics). Use the CLI flags instead of `options.typeAware` / `options.typeCheck`: those options are only allowed in the root config, and these workspace configs are nested when Oxlint runs from the repo root (as editors do).
- `oxlint-tsgolint` bundles its own TypeScript, so bump it together with `typescript` (`7.0.2` ↔ `7.0.2xxx`).
- Only `rules`, `categories`, `plugins` and `overrides` are inherited through `extends` ([docs](https://oxc.rs/docs/guide/usage/linter/nested-config.html#extending-configuration-files)). Top-level fields such as `ignorePatterns` must be redeclared in the workspace config.
