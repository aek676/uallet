# `api`

The backend: an [Elysia](https://elysiajs.com) server on [Bun](https://bun.com). For now it has a health check and the wallet's sessions: the wallet proves who the user is with the MetaMask Embedded Wallets (Web3Auth) identity token and gets a short-lived session of ours. It will sponsor the wallet's payments: build the payment transaction, sign it as the fee payer and return it to the wallet to sign and send.

## Bun is only the runtime

aube installs the dependencies and runs the scripts, as in the rest of the repo; don't use `bun install`, `bun add` or `bunx`. Bun runs the server (`dev`). Lint, type-check and tests run under Node like every other workspace: the tests call the app with `app.handle(new Request(...))`, without listening, which Elysia supports outside Bun.

It needs **Bun 1.4.x** on your `PATH` (`engines.bun` in [`package.json`](package.json)):

```sh
curl -fsSL https://bun.com/install | bash
bun --version   # 1.4.x
```

## Environment variables

Declared in [`.env.schema`](.env.schema), with the shared setup in the [root README](../../README.md#environment-variables):

| Variable             | Notes                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_PORT`           | Port the server listens on. `5177`, set in the schema.                                                                                                                      |
| `LOG_LEVEL`          | Minimum level the [logger](#logging) writes. `info` in the schema, `silent` in `.env.test`.                                                                                 |
| `API_SESSION_KEY`    | Signs our [sessions](#sessions). Secret, from Infisical; a public placeholder in `.env.test`.                                                                               |
| `WEB3AUTH_CLIENT_ID` | The wallet's client ID: identity tokens must carry it as audience. Read from the wallet's Infisical secret (`infisical("VITE_WEB3AUTH_CLIENT_ID")`), so one value for both. |
| `WEB3AUTH_JWKS_URL`  | Web3Auth's signing keys. Defaults to `https://api.web3auth.io/citadel-service/.well-known/jwks.json` in the schema.                                                         |
| `WEB3AUTH_ISSUER`    | `iss` of the identity tokens. Defaults to `web3auth.io` in the schema.                                                                                                      |

Varlock loads and validates them when the server starts: [`src/index.ts`](src/index.ts) imports `varlock/auto-load` before anything else, so an invalid value stops it before it listens. The tests load them the same way, from `.env.test` (`setupFiles` in [`vitest.config.ts`](vitest.config.ts)). Read them through `#/config/env`. [`bunfig.toml`](bunfig.toml) turns off Bun's own `.env` loading, which would otherwise inject the raw `.env.local` values before Varlock resolves them.

These are server-only values: they never reach a browser, so they don't use the `VITE_` prefix, not even `WEB3AUTH_CLIENT_ID`, whose value is the wallet's public `VITE_WEB3AUTH_CLIENT_ID`. Secrets come from Infisical: `API_SESSION_KEY` now, the fee payer's key later.

## Run

```sh
aube run dev --filter api
```

It runs on `http://localhost:5177` and restarts on changes (`bun --watch`). If the port is taken, Bun fails instead of picking another. The logs go through `pino-pretty`, which makes them readable.

## Endpoints

| Method | Path            | Request                                                   | Response                                                                                                                   |
| ------ | --------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`       |                                                           | `{ "status": "ok" }`.                                                                                                      |
| `POST` | `/auth/session` | `Authorization: Bearer <identity token>`, `{ "address" }` | 200 `{ "token", "expiresAt" }` (ISO date). 401 `invalid_token`, `address_mismatch` or `no_solana_key`. 400 `invalid_body`. |
| `GET`  | `/auth/me`      | `Authorization: Bearer <session>`                         | 200 `{ "address" }`. 401 `invalid_session`.                                                                                |

Errors are `{ "error": "<code>" }`. Invalid or unparseable bodies answer 400 `invalid_body`, not Elysia's 422 ([`plugins/error-responses.ts`](src/plugins/error-responses.ts)).

## Sessions

The wallet logs in with MetaMask Embedded Wallets (Web3Auth), whose identity token proves who the user is but expires, and the SDK doesn't refresh it. So the wallet trades it once for a session of ours (`POST /auth/session`), and later requests carry that session.

1. The wallet sends the identity token (`web3Auth.getAuthTokenInfo()`) as bearer and its Solana address in the body.
2. We verify the token ([`routes/auth/service.ts`](src/routes/auth/service.ts)): ES256, signed by a key in Web3Auth's JWKS, issuer `web3auth.io`, not expired, and **audience = our client ID**. All Web3Auth projects share the signing keys, so without the audience check another project's token would pass. Web3Auth's docs still name `api-auth.web3auth.io` for the JWKS, which doesn't serve the v11 SDK's keys.
3. The token's `wallets` claim lists the user's keys. Each `curve: "ed25519"` entry is a Solana key (`public_key` is its 32 bytes in hex). The address must match one of them. A live login (Sapphire Devnet, `@web3auth/no-modal` 11.4.3) showed the wallet's address is the `web3auth_app_key` entry; any ed25519 entry is still accepted, both are the user's. Each new session logs `Session created` with the address and the `type` of the entry that matched, never the email or the name.
   - `address_mismatch`: valid token, but the address isn't one of its keys.
   - `no_solana_key`: valid token without ed25519 keys. The fallback would be the wallet signing a challenge; not implemented.
4. We answer with our session ([`lib/session-token.ts`](src/lib/session-token.ts)): an HS256 JWT with `sub` = the Solana address, issuer and audience `uallet-api`, valid for 1 hour.

The identity token lasts **24 hours** from login (`exp - iat`, seen live), and the SDK doesn't renew it even if the Web3Auth session lasts longer. After that, `POST /auth/session` answers `invalid_token` until the user logs in again.

Protected routes use the `auth` macro ([`plugins/session-auth.ts`](src/plugins/session-auth.ts)): `{ auth: true }` on a route resolves `address` from `Authorization: Bearer <session>`, or answers 401. `src/app.ts` builds it once from the session tokens and passes it to each route feature that needs it, which `.use()`s it.

**The session key is `API_SESSION_KEY`** (Infisical): 32 random bytes in base64url, without padding. Sessions survive restarts, and every instance sharing the key accepts them. Changing it ends every session (the wallet opens a new one on a 401). Each environment needs its own key. Generate one with `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`.

## Code

```text
src/index.ts                  loads the env and starts listening (the only place for Bun APIs)
src/app.ts                    builds the real dependencies and composes the route features with .use(); exported without listening
src/routes/<name>/index.ts    the feature's Elysia instance: routes, validation, status codes
src/routes/<name>/model.ts    one `<Name>Model` object with the schemas (`t`) and a same-named type derived from it; the route maps them to status codes
src/routes/<name>/service.ts  business logic: plain values in, plain values or errors out
src/plugins/                  shared Elysia behaviour (auth, error mapping)
src/lib/                      shared clients and helpers, without HTTP (logger.ts: the logger)
src/config/env.ts             the env, the only module that imports varlock/env
```

Every feature has a `model.ts`: `index.ts` can't import `t` (lint), so its schemas live there. Add `service.ts` when it has logic: [`routes/auth`](src/routes/auth) has all three, [`routes/health`](src/routes/health) only `index.ts` and `model.ts`. A feature with dependencies is a factory (`authRoutes({ verifyIdToken, sessions, sessionAuth })`): `src/app.ts` passes the real ones, tests their own.

Services don't know about HTTP: they return expected failures as values and the route maps them to a status. `verifyIdToken` returns `{ ok: false, error }`; an `Error` subclass works too:

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
}, { body: PaymentModel.paymentBody, response: { 200: PaymentModel.paymentResponse } })
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
- The folder boundaries above: shared folders can't import routes or the app, route features can't import each other, services and `src/lib` import only types from `elysia`, a route's `index.ts` doesn't import `t` (schemas go in `model.ts`), nothing imports `#/index`.

`tsconfig.json` extends `@repo/typescript-config/bun.json`, which adds `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` and others to `strict`.

To disable a rule, do it on the line, naming the rule and saying why:

```ts
// oxlint-disable-next-line no-await-in-loop -- each transfer needs the previous blockhash
```

## Tests

```sh
aube run test --filter api
```

Test a feature through its own instance (`health.handle(new Request(...))`) and services directly. The auth tests build `authRoutes` with their own identity tokens, signed with an ES256 key generated by jose, a local key set (`createLocalJWKSet`) instead of Web3Auth's, a fake clock and a spy on `log.info`. [`src/app.test.ts`](src/app.test.ts) checks that every route declares a `response` schema. Use Vitest, not `bun:test`: the tests run under Node.
