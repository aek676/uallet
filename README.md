# Uallet

Monorepo ([Turborepo](https://turborepo.dev) + [aube](https://aube.jdx.dev)) for the Uallet Solana wallet.

## Documentation

- [`docs/overview.md`](docs/overview.md): what Uallet is, who it's for and where it's headed.
- [`docs/architecture.md`](docs/architecture.md): how the pieces fit together, the payment flow and the design decisions.

## What's inside?

### Apps and Packages

- `wallet`: the student wallet app ([Vite](https://vite.dev) + React). See its [README](apps/wallet/README.md) for setup
- `merchant`: the shop app, which shows the Solana Pay QR code to charge ([Vite](https://vite.dev) + React). See its [README](apps/merchant/README.md) for setup
- `api`: the backend ([Elysia](https://elysiajs.com) on [Bun](https://bun.com)), for now a health check and the wallet's sessions (Web3Auth identity token in, our session out); it will sponsor the fees of the wallet's payments. See its [README](apps/api/README.md)
- `registry`: command-line tools to register merchants on-chain (the merchant registry, on the Solana Attestation Service), run with Bun. See its [README](tools/registry/README.md)
- `@repo/payments`: shared payment logic (payment token config, amounts and their formatting, token accounts, Solana Pay links, reading the merchant registry)
- `@repo/i18n`: the apps' texts in English and Spanish ([Paraglide JS](https://paraglidejs.com) project; each app compiles it)
- `@repo/ui`: design system: [shadcn/ui](https://ui.shadcn.com) components (Base UI primitives) + Tailwind CSS v4 design tokens
- `@repo/oxlint-config`: shared [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration (`@repo/oxlint-config/react` for React workspaces, `@repo/oxlint-config/api` for `api`)
- `@repo/typescript-config`: shared `tsconfig.json` files (`react.json` for React workspaces, `bun.json` for `api`)

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

### Package manager and runtimes

aube installs every dependency and runs every script; don't use `bun install`, `bun add` or `bunx`. Node (the version in `devEngines`, which aube provides) runs the tooling, the React apps' dev servers and all the tests. [Bun](https://bun.com) 1.4.x is only the runtime of `apps/api` and of the `tools/registry` commands: install it once (`curl -fsSL https://bun.com/install | bash`) so `bun` is on your `PATH`.

### Utilities

- [TypeScript](https://www.typescriptlang.org/) for static type checking, run by Oxlint (`--type-check`) as part of `lint`, not by `tsc`
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for code linting
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for code formatting
- [Varlock](https://varlock.dev) for environment variables, with development values in [Infisical](https://infisical.com)

## Environment variables

Each app declares its variables in a committed `.env.schema` (types, validation, docs) and imports the shared ones from the root [`.env.schema`](.env.schema). The Vite plugin loads and validates them on `dev`, `build` and `test` (in `api`, `varlock/auto-load` does when the server starts), and generates the types in `apps/*/env.d.ts` (git-ignored; `lint` regenerates them first with `varlock codegen`).

| Environment  | `APP_ENV`               | Values from                                    |
| ------------ | ----------------------- | ---------------------------------------------- |
| Development  | `development` (default) | Infisical, project `uallet`, environment `dev` |
| Tests and CI | `test`                  | The committed `.env.test` files                |

### Setup (once per machine)

Ask the team for the Infisical client secret, then create a `.env.local` at the repo root (git-ignored):

```sh
echo 'INFISICAL_CLIENT_SECRET=varlock(prompt)' > .env.local
aube exec varlock load
```

Varlock prompts for the secret and writes it back encrypted for this device (Secure Enclave and Touch ID on macOS). Values from Infisical are cached for an hour: run `aube exec varlock load --clear-cache` to pick up a change right away.

To override a value locally, set it in that app's `.env.local` (e.g. your own `VITE_MERCHANT_ADDRESS` in `apps/merchant/.env.local`). It takes precedence over Infisical.

Useful commands (run from the repo root or an app directory):

```sh
aube exec varlock load            # validate and show the values (secrets masked)
aube exec varlock reveal NAME     # show a secret without leaving it in the scrollback
```

The pre-commit hook runs `varlock scan --staged`, which blocks a commit containing the client secret.

## Design system

- **Tokens** live in `packages/ui/src/styles/globals.css` (colors in OKLCH for light and `.dark`, fonts, `--radius`). Components only use semantic classes (`bg-primary`, `text-muted-foreground`, `bg-success`, ...).
- **Components** live in `packages/ui/src/components` and are imported as `@repo/ui/components/<name>`.
- Wrap each app in `ThemeProvider` (`@repo/ui/components/theme-provider`) and import `@repo/ui/globals.css` once.

### Adding shadcn/ui components

Run the CLI **from `packages/ui`**, with aube activated:

```sh
eval "$(aube activate zsh)"   # once per shell, or add it to your shell rc
cd packages/ui
aubx shadcn@latest add <component>
```

The shadcn CLI doesn't support aube yet ([#1](https://github.com/aek676/uallet/issues/1)), hence these steps:

- **Missing dependencies:** shadcn installs them with `npm`. `aube activate` puts aube's `npm` shim first in `PATH`, and since aube 2.10.1 it stays there under `aubx` and `aube exec`. Without activation, shadcn runs the real `npm`, which fails on `catalog:` specifiers (`EUNSUPPORTEDPROTOCOL`).
- **The `aube` on your `PATH` has to be 2.10.1 or later:** the shim runs that binary, not the version pinned in `devEngines`. On 2.9.0 it fails with `unknown option '--no-audit'`. Check it with `aube --version` from outside the repo (inside, aube reports the pinned version).
- **Not from the apps:** shadcn only finds workspaces through `pnpm-workspace.yaml` or `workspaces` in `package.json`, not `aube-workspace.yaml`. From the repo root it asks to create a `components.json` (answer no). From an app it fails with `Could not resolve the following aliases ... ui, utils`. aube only reads `package.json#workspaces` when there is no workspace YAML, so adding it would be a second list that nothing keeps in sync.

shadcn adds new dependencies with a plain version range. Move them to a catalog in `aube-workspace.yaml` if other packages share them.

## CI

GitHub Actions runs on every pull request (stacked ones included) and on every push to `main`:

- `.github/workflows/ci.yml`: format check, lint and type-check, package boundaries (`turbo boundaries`), build, tests (`turbo run test`), `aube audit` (fails on `high` or `critical` advisories), and [TruffleHog](https://github.com/trufflesecurity/trufflehog) on the new commits to catch leaked secrets. Turborepo caches task results in the GitHub Actions cache, so unchanged packages hit cache.
- `.github/workflows/pr-title.yml`: checks that the PR title follows [Conventional Commits](https://www.conventionalcommits.org). PRs are squash-merged, and the title becomes the commit title on `main`.
- `.github/workflows/security.yml`: a weekly `aube audit`, and [zizmor](https://docs.zizmor.sh) on the workflows for every PR and push to `main`. zizmor uploads its findings to the Security tab. CodeQL runs with GitHub's default setup (no workflow file).

The `main` ruleset requires two checks, **CI OK** (fails if any CI job fails) and **Validate PR title**, plus code scanning merge protection for CodeQL and zizmor. Secret scanning with push protection is on in the repo settings.

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
