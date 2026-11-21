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

| Variable    | Notes                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| `API_PORT`  | Port the server listens on. `5177`, set in the schema.                                      |
| `LOG_LEVEL` | Minimum level the [logger](#logging) writes. `info` in the schema, `silent` in `.env.test`. |

Varlock loads and validates them when the server starts: [`src/index.ts`](src/index.ts) imports `varlock/auto-load` before anything else, so an invalid value stops it before it listens. The tests load them the same way, from `.env.test` (`setupFiles` in [`vitest.config.ts`](vitest.config.ts)). Read them through `#/config/env`. [`bunfig.toml`](bunfig.toml) turns off Bun's own `.env` loading, which would otherwise inject the raw `.env.local` values before Varlock resolves them.

These are server-only values: they never reach a browser, so they don't use the `VITE_` prefix. Secrets (e.g. the fee payer's key) will come from Infisical.

## Run

```sh
aube run dev --filter api
```

It runs on `http://localhost:5177` and restarts on changes (`bun --watch`). If the port is taken, Bun fails instead of picking another. The logs go through `pino-pretty`, which makes them readable.

## Endpoints

| Method | Path      | Response              |
| ------ | --------- | --------------------- |
| `GET`  | `/health` | `{ "status": "ok" }`. |

## Code

```text
src/index.ts                  loads the env and starts listening (the only place for Bun APIs)
src/app.ts                    composes the route features with .use(); exported without listening, for tests
src/routes/<name>/index.ts    the feature's Elysia instance: routes, validation, status codes
src/routes/<name>/model.ts    request and response schemas (`t`), with the types derived from them
src/routes/<name>/service.ts  business logic: plain values in, plain values or errors out
src/plugins/                  shared Elysia behaviour (auth, error mapping)
src/lib/                      shared clients and helpers, without HTTP (logger.ts: the logger)
src/config/env.ts             the env, the only module that imports varlock/env
```

Add `model.ts` and `service.ts` when a feature needs them; [`routes/health`](src/routes/health/index.ts) is a single file.

Services don't know about HTTP: they return expected failures as values (an `Error` subclass) and the route maps them to a status:

```ts
// src/routes/payment/service.ts
export class InsufficientFunds extends Error {}

export async function buildPayment(amount: bigint) {
  if (amount > balance) return new InsufficientFunds();
  return { transaction };
}

// src/routes/payment/index.ts
.post("/", async ({ body, status }) => {
  const result = await buildPayment(body.amount);
  if (result instanceof InsufficientFunds) return status(402, "Insufficient funds");
  return result;
}, { body: PaymentModel.Body, response: PaymentModel.Response })
```

`#/` imports point to `src`. Bun 1.4 doesn't resolve `#/` in `package.json#imports` (TypeScript and Vitest do), so the alias is also in `tsconfig.json` `paths`, which Bun reads. Keep both in sync.

Elysia is **1.4**: route options go after the handler (`.get(path, handler, options)`). The committed [`elysiajs` skill](../../.agents/skills/elysiajs) describes 2.0, so check the installed types where they differ.

## Logging

[pino](https://getpino.io), through [`@bogeychan/elysia-logger`](https://github.com/bogeychan/elysia-logger). [`src/lib/logger.ts`](src/lib/logger.ts) creates `log`, and `src/app.ts` mounts it as a plugin (`log.into()`). The plugin logs every response, except `/health`, with its method, URL and time. It also logs errors, and it adds `ctx.log` to handlers.

```ts
// in a handler
({ log, body }) => {
  log.info({ amount: body.amount }, "building payment");
};

// in a service or at startup
import { log } from "#/lib/logger";
log.warn({ attempt, err: error.message }, "RPC call failed");
```

Pass the data as an object first and the message second, so it stays searchable as JSON. Never log secrets (keys, signatures, tokens). The server always writes JSON, one object per line, to stdout. Only `dev` pretty-prints it, through a pipe (`| pino-pretty`): a `pino-pretty` transport would run in a worker and could lose the last lines on exit. `console` is a lint error in `src`.

## Lint

[`oxlint.config.ts`](oxlint.config.ts) extends `@repo/oxlint-config/api` ([README](../../packages/oxlint-config/README.md)), stricter than the rest of the repo:

- `suspicious` and `perf` rules are errors, and the `lint` script fails on warnings (`--deny-warnings`) and on unused `oxlint-disable` comments.
- Extra type-aware rules: no `!`, no unnecessary conditions, `strict-boolean-expressions` (numbers and strings aren't conditions: `0n` is a valid amount), exhaustive `switch`, `??` over `||`.
- No `process.env` (use `#/config/env`), no `console` (use the [logger](#logging)), no `Bun` outside `src/index.ts`, no `export default` in `src` (Bun would serve it on its own).
- The folder boundaries above: shared folders can't import routes or the app, route features can't import each other, services and `src/lib` import only types from `elysia`, nothing imports `#/index`.

`tsconfig.json` extends `@repo/typescript-config/bun.json`, which adds `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` and others to `strict`.

To disable a rule, do it on the line, naming the rule and saying why:

```ts
// oxlint-disable-next-line no-await-in-loop -- each transfer needs the previous blockhash
```

## Tests

```sh
aube run test --filter api
```

Test a feature through its own instance (`health.handle(new Request(...))`) and services directly. [`src/app.test.ts`](src/app.test.ts) checks that every route declares a `response` schema. Use Vitest, not `bun:test`: the tests run under Node.
