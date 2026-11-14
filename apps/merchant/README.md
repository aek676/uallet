# `merchant`

The shop app: type the amount, show the Solana Pay QR code the student scans with the [wallet](../wallet/README.md) and see when it's paid. Runs on Solana devnet.

The merchant only receives payments, so there is no login: each device is configured with the merchant's address. Logins, the merchant registry and business wallets come in phase 2.

## Setup

### 1. A wallet for the merchant

The merchant needs its own Solana address, different from the student wallet you pay with. The easiest way: log in to the wallet app with another account and copy its address. You'll also see the merchant's balance go up there when it gets paid.

It doesn't need any funds: it only receives.

### 2. Environment variables

In development they come from Infisical: follow the one-time setup in the [root README](../../README.md#environment-variables). They are declared in [`.env.schema`](.env.schema):

| Variable                | Notes                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `VITE_MERCHANT_ADDRESS` | Solana address that receives the payments. From Infisical; to use your own, set it in `apps/merchant/.env.local`. |
| `VITE_MERCHANT_NAME`    | Shown to the student when paying (Solana Pay `label`). At most 40 characters. Set in the schema.                  |
| `VITE_SOLANA_RPC_URL`   | Solana devnet RPC, to detect payments (shared with wallet, in the root schema).                                   |
| `VITE_SOLANA_WS_URL`    | Solana devnet WebSocket (shared, in the root schema).                                                             |

Varlock validates them when Vite starts. **Everything here ends up in the browser bundle.** The address and the name are public anyway (they go in the QR code). A dedicated RPC URL embeds an API key: restrict it to your domains in the provider's dashboard.

### 3. Run

```sh
aube run dev --filter merchant
```

It runs on `http://localhost:5175`.

## Routes

File-based routes with [TanStack Router](https://tanstack.com/router), in `src/app/routes`. The Vite plugin regenerates `src/app/route-tree.gen.ts` on `dev` and `build`; it's committed, so `lint` type-checks without running Vite.

| Path                                                | Screen                        |
| --------------------------------------------------- | ----------------------------- |
| `/`                                                 | New charge form.              |
| `/charges/$reference?amount=<base units>&concept=…` | The QR code, until it's paid. |
| Anything else, or an invalid `reference`            | "This page doesn't exist".    |

The URL holds what a charge needs besides config: its `reference`, the `amount` in base units of `PAYMENT_TOKEN` (`1200000` is €1.20) and the optional `concept`. The recipient, token and label always come from config, so an edited link can't send the payment elsewhere. An amount or concept the form wouldn't accept shows "This charge isn't valid".

So reloading the QR page shows the same charge and keeps watching for its payment, and finds one that landed meanwhile (the watcher looks back). A reloaded paid charge shows "Paid" again, without counting it twice in the metrics. Back from the QR is like "Cancel"; "Cancel" and "New charge" replace the history entry, so back or forward never bring a closed charge back.

`vite dev` and `vite preview` serve `index.html` for every path. A static deploy needs the same SPA fallback, or reloading `/charges/…` gives a 404.

## Languages

English by default, Spanish as an option, with [Paraglide JS](https://paraglidejs.com). The language is the one picked in the header menu, else the browser's if it's Spanish, else English. Changing it reloads the page.

- Texts live in `messages/en.json` and `messages/es.json`: add every key to both. `m.<key>()` from `#/paraglide/messages.js` returns it in the current language, and a misspelled key fails type-checking.
- `src/paraglide` is generated and git-ignored. The Vite plugin compiles it on `dev`, `build` and `test`; `codegen` does it for `lint`. Options are in `project.inlang/paraglide.config.ts`.
- Amounts, numbers and dates go through `#/lib/format`, in `en-US` or `es-ES`.
- Texts built outside a render (Zod errors, lookup tables) are functions, so they come out in the language at the time they're used.
- Tests run outside a browser, so they get English.
- Paraglide also saves the detected language on the first visit (`localStorage`, `uallet:merchant:locale`): a device keeps the language it first opened with until someone picks another.

## Charges

- Amount: up to 2 decimals, at most €100 (`MAX_CHARGE_EUROS`), so a typo can't become a big charge.
- Concept: optional, at most 60 characters. It goes in the Solana Pay `message`: the student sees it, but it isn't stored on-chain.
- Every charge gets a new `reference`, the address the merchant uses to find the payment.

The QR code is always black on white, even in dark mode: many phone cameras can't read an inverted QR. "Copy link" copies the `solana:` link, in case a camera fails.

## Payment detection

While the QR code is on screen, the app watches the chain for the payment (`waitForPayment`):

1. It subscribes to the transactions that mention the charge's `reference` (`logsSubscribe` at `confirmed`), the fast path. Notifications for simulated transactions (all-zero signature) are skipped.
2. It also asks for them every second (`getSignaturesForAddress`): RPCs drop notifications and connections, and this finds what landed before subscribing too. If the subscription can't connect or breaks, this keeps going on its own.
3. Each transaction is fetched at `finalized` and checked with `validatePayment` (`@repo/payments`): it succeeded, it includes the `reference`, and the merchant's token accounts for `PAYMENT_TOKEN` received **exactly** the amount. Anything else is ignored and the charge keeps waiting.

So "Paid" means the payment can't be reverted. On devnet and mainnet `finalized` reports the same slot as `confirmed`, so it costs no time.

### `confirmed` or `finalized` for the subscription

Measured with a probe that subscribed at both levels to each of 39 real payments (two runs, devnet's public RPC):

- Both notifications arrive at the same time: `finalized` minus `confirmed` is −1 ms (median), never more than 7 ms apart.
- `finalized` loses more: 6 of 32 notifications against 4 of 39 for `confirmed` (11-20% against 2-5% on a busy address).
- A `finalized` subscription also gets the notification of the wallet's **simulation**, ~200 ms after the tap, in 12 of 39 payments. It's not a payment: before skipping it, it showed "Checking the payment…" too early.
- The transaction could always be fetched at `finalized` as soon as the notification arrived (32 of 32 where the probe could check).

Hence: announce at `confirmed`, read and validate at `finalized`.

| Screen                  | Meaning                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| "Waiting for payment…"  | Listening.                                                                                                                 |
| "Checking the payment…" | A transaction mentions the charge and is being validated. Cancel is disabled meanwhile.                                    |
| "Paid"                  | Paid, with how it was detected and a link to the Explorer. "New charge" starts over.                                       |
| "We stopped listening…" | The RPC stopped answering (3 failed look-backs in a row). "Retry" listens again and finds a payment that landed meanwhile. |

## Metrics

Each detected payment records how it was announced (subscription or look-back) and how long fetching and validating it took. The last 50 stay on the device and the **Metrics** card at the bottom shows them, with a button to clear them.

The end-to-end time (the student's tap to "Paid") can't be computed in the apps: they run on different devices with different clocks. It was measured with both apps in one browser, on devnet's public RPC (39 payments of 0.01 EURC):

| Detected by                   | Payments | "Paid" after the wallet's "Payment complete" | Tap to "Paid" (p50) |
| ----------------------------- | -------- | -------------------------------------------- | ------------------- |
| Notification                  | 33       | ~70 ms (p95 84 ms)                           | ~1.0 s              |
| Look-back (notification lost) | 6        | 1.0-1.8 s                                    | ~2.3 s              |

Validating takes ~70 ms (p95 82 ms). With a notification, the merchant knows within ~0.1 s of the student.

## Known issues

- Anyone with access to the device can change the merchant's address in `.env.local`. Fine for a controlled demo; phase 2 moves it to the merchant registry.
- **Devnet's public RPC drops notifications.** 6 of 39 payments were found by looking back, about 1.2-1.5 s later than by notification. To measure with a dedicated RPC.
- **Devnet's public RPC limits per IP**: 5 WebSocket connections (a closed one keeps counting for ~60 s), and 10 `getSignaturesForAddress` or `getTransaction` requests per 10 s. One merchant looking back every second uses most of the latter. Every device behind the campus network shares one public IP, so a real deployment needs a dedicated RPC.
- A payment of any other amount is never accepted: the charge keeps waiting and the money stays with the merchant, to refund by hand.
- The payment is verified in the browser. A backend should verify it too before anything of value depends on it (phase 2).
