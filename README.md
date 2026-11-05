# Uallet

Monorepo ([Turborepo](https://turborepo.dev) + [aube](https://aube.jdx.dev)) for the Uallet Solana wallet.

## What's inside?

### Apps and Packages

- `wallet`: the student wallet app ([Vite](https://vite.dev) + React)
- `docs`: the living style guide: design tokens and every `@repo/ui` component with its variants
- `@repo/ui`: design system: [shadcn/ui](https://ui.shadcn.com) components (Base UI primitives) + Tailwind CSS v4 design tokens
- `@repo/oxlint-config`: shared [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration (`@repo/oxlint-config/react` for React workspaces)
- `@repo/typescript-config`: shared `tsconfig.json` files (`react.json` for React workspaces)

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

- [TypeScript](https://www.typescriptlang.org/) for static type checking, run by Oxlint (`--type-check`) as part of `lint`, not by `tsc`
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for code linting
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for code formatting

## Design system

- **Tokens** live in `packages/ui/src/styles/globals.css` (colors in OKLCH for light and `.dark`, fonts, `--radius`). Components only use semantic classes (`bg-primary`, `text-muted-foreground`, `bg-success`, ...).
- **Components** live in `packages/ui/src/components` and are imported as `@repo/ui/components/<name>`.
- Wrap each app in `ThemeProvider` (`@repo/ui/components/theme-provider`) and import `@repo/ui/globals.css` once.
- Run `aube run dev` and open the `docs` app to browse the style guide.

### Adding shadcn/ui components

Run the CLI **from `packages/ui`**. The shadcn CLI doesn't support aube yet ([#1](https://github.com/aek676/uallet/issues/1)):

- It only finds workspaces through `pnpm-workspace.yaml` or `workspaces` in `package.json`, not `aube-workspace.yaml`. From the repo root it asks to create a `components.json` (answer no). From `apps/web` or `apps/docs` it fails with `Could not resolve the following aliases ... ui, utils`. The shadcn monorepo docs run `add` from the app, but that doesn't work here yet.
- It installs missing dependencies with `npm`, which fails on `catalog:` specifiers.

So install the dependencies with aube first, so the CLI only has to copy files:

```sh
cd packages/ui

# 1. List the component's dependencies ("Dependencies")
aubx shadcn@latest add <component> --dry-run

# 2. Install the ones that are missing
aube add <dependencies>

# 3. Add the component
aubx shadcn@latest add <component>
```

## CI

GitHub Actions runs on every pull request (stacked ones included) and on every push to `main`:

- `.github/workflows/ci.yml`: format check, lint and type-check, package boundaries (`turbo boundaries`), build, `aube audit` (fails on `high` or `critical` advisories), and [TruffleHog](https://github.com/trufflesecurity/trufflehog) on the new commits to catch leaked secrets. Turborepo caches task results in the GitHub Actions cache, so unchanged packages hit cache.
- `.github/workflows/pr-title.yml`: checks that the PR title follows [Conventional Commits](https://www.conventionalcommits.org). PRs are squash-merged, and the title becomes the commit title on `main`.
- `.github/workflows/security.yml`: a weekly `aube audit`, and [zizmor](https://docs.zizmor.sh) on the workflows whenever `.github/` changes.

Branch protection needs to require two checks: **CI OK**, which fails if any CI job fails, and **Validate PR title**.

Install with a frozen lockfile, as CI does, to catch a `package.json` change without its lockfile update:

```sh
aube install --frozen-lockfile
```

## Updating dependencies

Dependabot only updates the GitHub Actions. It doesn't support aube, so it can't update `aube-lock.yaml` or the catalogs in `aube-workspace.yaml`. Update npm dependencies by hand with aube:

```sh
# See what's outdated
aube outdated -r

# Pick what to update, and how far
aube update -i -r
```

Commit `package.json`, `aube-workspace.yaml` and `aube-lock.yaml` together.
