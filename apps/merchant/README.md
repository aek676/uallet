# `merchant`

The shop app: type the amount, show the Solana Pay QR code the student scans with the [wallet](../wallet/README.md) and see when it's paid. Runs on Solana devnet.

The merchant only receives payments, so there is no login: each device is configured with the merchant's address. Logins, the merchant registry and business wallets come in phase 2.

## Setup

### 1. A wallet for the merchant

The merchant needs its own Solana address, different from the student wallet you pay with. The easiest way: log in to the wallet app with another account and copy its address. You'll also see the merchant's balance go up there when it gets paid.

It doesn't need any funds: it only receives.

### 2. Environment variables

```sh
cp apps/merchant/.env.example apps/merchant/.env.local
```

| Variable                | Required | Notes                                                                                   |
| ----------------------- | -------- | --------------------------------------------------------------------------------------- |
| `VITE_MERCHANT_ADDRESS` | Yes      | Solana address that receives the payments.                                              |
| `VITE_MERCHANT_NAME`    | Yes      | Shown to the student when paying (Solana Pay `label`). At most 40 characters.           |
| `VITE_SOLANA_RPC_URL`   | No       | To detect payments. Defaults to `https://api.devnet.solana.com` (public, rate-limited). |
| `VITE_SOLANA_WS_URL`    | No       | Defaults to `wss://api.devnet.solana.com`.                                              |

`src/config/env.ts` validates them at startup. **Everything here ends up in the browser bundle.** The address and the name are public anyway (they go in the QR code). A dedicated RPC URL embeds an API key: restrict it to your domains in the provider's dashboard.

### 3. Run

```sh
aube run dev --filter merchant
```

It runs on `http://localhost:5175`.

## Charges

- Amount: up to 2 decimals, at most 100 € (`MAX_CHARGE_EUROS`), so a typo can't become a big charge.
- Concept: optional, at most 60 characters. It goes in the Solana Pay `message`: the student sees it, but it isn't stored on-chain.
- Every charge gets a new `reference`, the address the merchant uses to find the payment.

The QR code is always black on white, even in dark mode: many phone cameras can't read an inverted QR. "Copiar enlace" copies the `solana:` link, in case a camera fails.

## Payment detection

While the QR code is on screen, the app watches the chain for the payment (`waitForPayment`):

1. It subscribes to the transactions that mention the charge's `reference` (`logsSubscribe` at `confirmed`), the fast path. Notifications for simulated transactions (all-zero signature) are skipped.
2. It also asks for them every second (`getSignaturesForAddress`): RPCs drop notifications and connections, and this finds what landed before subscribing too. If the subscription can't connect or breaks, this keeps going on its own.
3. Each transaction is fetched at `finalized` and checked with `validatePayment` (`@repo/payments`): it succeeded, it includes the `reference`, and the merchant's token accounts for `PAYMENT_TOKEN` received **exactly** the amount. Anything else is ignored and the charge keeps waiting.

So "Pagado" means the payment can't be reverted. On devnet and mainnet `finalized` reports the same slot as `confirmed`, so it costs no time.

### `confirmed` or `finalized` for the subscription

Measured with a probe that subscribed at both levels to each of 39 real payments (two runs, devnet's public RPC):

- Both notifications arrive at the same time: `finalized` minus `confirmed` is −1 ms (median), never more than 7 ms apart.
- `finalized` loses more: 6 of 32 notifications against 4 of 39 for `confirmed` (11-20% against 2-5% on a busy address).
- A `finalized` subscription also gets the notification of the wallet's **simulation**, ~200 ms after the tap, in 12 of 39 payments. It's not a payment: before skipping it, it showed "Comprobando el pago…" too early.
- The transaction could always be fetched at `finalized` as soon as the notification arrived (32 of 32 where the probe could check).

Hence: announce at `confirmed`, read and validate at `finalized`.

| Screen                      | Meaning                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "Esperando pago…"           | Listening.                                                                                                                      |
| "Comprobando el pago…"      | A transaction mentions the charge and is being validated. Cancel is disabled meanwhile.                                         |
| "Pagado"                    | Paid, with how it was detected and a link to the Explorer. "Nuevo cobro" starts over.                                           |
| "Hemos dejado de escuchar…" | The RPC stopped answering (3 failed look-backs in a row). "Reintentar" listens again and finds a payment that landed meanwhile. |

## Metrics

Each detected payment records how it was announced (subscription or look-back) and how long fetching and validating it took. The last 50 stay on the device and the **Métricas** card at the bottom shows them, with a button to clear them.

The end-to-end time (the student's tap to "Pagado") can't be computed in the apps: they run on different devices with different clocks. It was measured with both apps in one browser, on devnet's public RPC (39 payments of 0.01 EURC):

| Detected by                   | Payments | "Pagado" after the wallet's "Pago realizado" | Tap to "Pagado" (p50) |
| ----------------------------- | -------- | -------------------------------------------- | --------------------- |
| Notification                  | 33       | ~70 ms (p95 84 ms)                           | ~1.0 s                |
| Look-back (notification lost) | 6        | 1.0-1.8 s                                    | ~2.3 s                |

Validating takes ~70 ms (p95 82 ms). With a notification, the merchant knows within ~0.1 s of the student.

## Known issues

- Anyone with access to the device can change the merchant's address in `.env.local`. Fine for a controlled demo; phase 2 moves it to the merchant registry.
- **Devnet's public RPC drops notifications.** 6 of 39 payments were found by looking back, about 1.2-1.5 s later than by notification. To measure with a dedicated RPC.
- **Devnet's public RPC limits per IP**: 5 WebSocket connections (a closed one keeps counting for ~60 s), and 10 `getSignaturesForAddress` or `getTransaction` requests per 10 s. One merchant looking back every second uses most of the latter. Every device behind the campus network shares one public IP, so a real deployment needs a dedicated RPC.
- A payment of any other amount is never accepted: the charge keeps waiting and the money stays with the merchant, to refund by hand.
- The payment is verified in the browser. A backend should verify it too before anything of value depends on it (phase 2).
