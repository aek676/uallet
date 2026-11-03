# `Turborepo` Vite starter

This is a community-maintained example. If you experience a problem, please submit a pull request with a fix. GitHub Issues will be closed.

## Using this example

Run the following command:

```sh
bun dlx create-turbo@latest -e with-vite
```

## What's inside?

This Turborepo includes the following packages and apps:

### Apps and Packages

- `docs`: a vanilla [Vite](https://vite.dev) TypeScript app
- `web`: another vanilla [Vite](https://vite.dev) TypeScript app
- `@repo/ui`: a stub component and utility library shared by both `web` and `docs`
- `@repo/oxlint-config`: shared [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration
- `@repo/typescript-config`: shared `tsconfig.json` files

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already set up for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for code linting
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for code formatting
