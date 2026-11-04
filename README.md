# Uallet

Monorepo ([Turborepo](https://turborepo.dev) + [aube](https://aube.jdx.dev)) for the Uallet Solana wallet.

## What's inside?

### Apps and Packages

- `web`: the wallet app ([Vite](https://vite.dev) + React)
- `docs`: the living style guide: design tokens and every `@repo/ui` component with its variants
- `@repo/ui`: design system: [shadcn/ui](https://ui.shadcn.com) components (Base UI primitives) + Tailwind CSS v4 design tokens
- `@repo/oxlint-config`: shared [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration (`@repo/oxlint-config/react` for React workspaces)
- `@repo/typescript-config`: shared `tsconfig.json` files (`react.json` for React workspaces)

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for code linting
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for code formatting

## Design system

- **Tokens** live in `packages/ui/src/styles/globals.css` (colors in OKLCH for light and `.dark`, fonts, `--radius`). Components only use semantic classes (`bg-primary`, `text-muted-foreground`, `bg-success`, ...).
- **Components** live in `packages/ui/src/components` and are imported as `@repo/ui/components/<name>`.
- Wrap each app in `ThemeProvider` (`@repo/ui/components/theme-provider`) and import `@repo/ui/globals.css` once.
- Run `aube run dev` and open the `docs` app to browse the style guide.

### Adding shadcn/ui components

Run the CLI **from `packages/ui`**. The shadcn CLI doesn't support aube yet ([#1](https://github.com/aek676/uallet/issues/1)) and installs missing dependencies with `npm`, which fails on `catalog:` specifiers. Install them with aube first, so the CLI only has to copy files:

```sh
cd packages/ui

# 1. List the component's dependencies ("Dependencies")
aubx shadcn@latest add <component> --dry-run

# 2. Install the ones that are missing
aube add <dependencies>

# 3. Add the component
aubx shadcn@latest add <component>
```
