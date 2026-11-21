# `api`

The backend: an [Elysia](https://elysiajs.com) server on [Bun](https://bun.com). For now it only has a health check. It will sponsor the wallet's payments: build the payment transaction, sign it as the fee payer and return it to the wallet to sign and send.

## Bun is only the runtime

aube installs the dependencies and runs the scripts, as in the rest of the repo; don't use `bun install`, `bun add` or `bunx`. Bun runs the server (`dev`). Lint, type-check and tests run under Node like every other workspace: the tests call the app with `app.handle(new Request(...))`, without listening, which Elysia supports outside Bun.

It needs **Bun 1.4.x** on your `PATH` (`engines.bun` in [`package.json`](package.json)):

```sh
curl -fsSL https://bun.com/install | bash
bun --version   # 1.4.x
```

## Environment variables

Declared in [`.env.schema`](.env.schema), with the shared setup in the [root README](../../README.md#environment-variables):

| Variable   | Notes                                                  |
| ---------- | ------------------------------------------------------ |
| `API_PORT` | Port the server listens on. `5177`, set in the schema. |

Varlock loads and validates them when the server starts: [`src/index.ts`](src/index.ts) imports `varlock/auto-load` before anything else, so an invalid value stops it before it listens. Read them through `#/config/env`. [`bunfig.toml`](bunfig.toml) turns off Bun's own `.env` loading, which would otherwise inject the raw `.env.local` values before Varlock resolves them.

These are server-only values: they never reach a browser, so they don't use the `VITE_` prefix. Secrets (e.g. the fee payer's key) will come from Infisical.

## Run

```sh
aube run dev --filter api
```

It runs on `http://localhost:5177` and restarts on changes (`bun --watch`). If the port is taken, Bun fails instead of picking another.

## Endpoints

| Method | Path      | Response              |
| ------ | --------- | --------------------- |
| `GET`  | `/health` | `{ "status": "ok" }`. |

## Code

- [`src/app.ts`](src/app.ts): the Elysia app and its routes. Exported without listening, for tests.
- [`src/index.ts`](src/index.ts): loads the env and starts listening.
- `#/` imports point to `src`. Bun 1.4 doesn't resolve `#/` in `package.json#imports` (TypeScript and Vitest do), so the alias is also in `tsconfig.json` `paths`, which Bun reads. Keep both in sync.

## Tests

```sh
aube run test --filter api
```
