# `@repo/oxlint-config`

Shared [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration for the monorepo.

## Usage

Add `@repo/oxlint-config` and `oxlint` as dev dependencies of the workspace, set its `lint` script to `oxlint`, and create an `oxlint.config.ts` (use `oxlint.config.mts` if the package has no `"type": "module"`):

```ts
import baseConfig from "@repo/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig],
});
```

## Notes

- TypeScript config files require Node.js >= 22.18.
- Only `rules`, `plugins` and `overrides` are inherited through `extends` ([docs](https://oxc.rs/docs/guide/usage/linter/nested-config.html#extending-configuration-files)). Top-level fields such as `ignorePatterns` must be redeclared in the workspace config.
