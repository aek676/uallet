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

## Notes

- TypeScript config files require Node.js >= 22.18.
- Type-aware rules (`typescript/no-floating-promises`, ...) only run with `--type-aware`. `--type-check` also reports TypeScript compiler errors, [replacing a separate `tsc --noEmit` step](https://oxc.rs/docs/guide/usage/linter/type-aware.html#type-checking-diagnostics). Use the CLI flags instead of `options.typeAware` / `options.typeCheck`: those options are only allowed in the root config, and these workspace configs are nested when Oxlint runs from the repo root (as editors do).
- `oxlint-tsgolint` bundles its own TypeScript, so bump it together with `typescript` (`7.0.2` ↔ `7.0.2xxx`).
- Only `rules`, `plugins` and `overrides` are inherited through `extends` ([docs](https://oxc.rs/docs/guide/usage/linter/nested-config.html#extending-configuration-files)). Top-level fields such as `ignorePatterns` must be redeclared in the workspace config.
