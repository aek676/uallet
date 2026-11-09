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

1. It subscribes to the transactions that mention the charge's `reference` (`logsSubscribe`), the fast path.
2. It also asks for them every second (`getSignaturesForAddress`): RPCs drop notifications, and this finds what landed before subscribing too.
3. Each transaction is fetched and checked with `validatePayment` (`@repo/payments`): it succeeded, it includes the `reference`, and the merchant's token accounts for `PAYMENT_TOKEN` received **exactly** the amount. Anything else is ignored and the charge keeps waiting.

Everything is read at `finalized`, so "Pagado" means the payment can't be reverted. On devnet and mainnet `finalized` reports the same slot as `confirmed`.

| Screen                      | Meaning                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| "Esperando pago…"           | Listening.                                                                                                                       |
| "Comprobando el pago…"      | A transaction mentions the charge and is being validated. Cancel is disabled meanwhile.                                          |
| "Pagado"                    | Paid, with a link to the Explorer. "Nuevo cobro" starts over.                                                                    |
| "Hemos dejado de escuchar…" | The subscription broke or the RPC stopped answering. "Reintentar" listens again and finds a payment that landed in the meantime. |

## Known issues

- Anyone with access to the device can change the merchant's address in `.env.local`. Fine for a controlled demo; phase 2 moves it to the merchant registry.
- **Devnet's public RPC drops notifications.** In 2 of 3 test payments the notification never arrived, and the payment showed up through the look-back about 1.5 s after the wallet's confirmation instead of ~0.1 s. In a probe, `finalized` notifications missed 11-20% of the transactions `confirmed` ones delivered, and `confirmed` missed 2-5%. To measure with a dedicated RPC.
- A payment of any other amount is never accepted: the charge keeps waiting and the money stays with the merchant, to refund by hand.
- The payment is verified in the browser. A backend should verify it too before anything of value depends on it (phase 2).
