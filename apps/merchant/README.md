# `merchant`

The shop app: type the amount and show the Solana Pay QR code the student scans with the [wallet](../wallet/README.md). Runs on Solana devnet.

The merchant only receives payments, so there is no login: each device is configured with the merchant's address. Logins, the merchant registry and business wallets come in phase 2.

## Setup

### 1. A wallet for the merchant

The merchant needs its own Solana address, different from the student wallet you pay with. The easiest way: log in to the wallet app with another account and copy its address. You'll also see the merchant's balance go up there when it gets paid.

It doesn't need any funds: it only receives.

### 2. Environment variables

```sh
cp apps/merchant/.env.example apps/merchant/.env.local
```

| Variable                | Required | Notes                                                                         |
| ----------------------- | -------- | ----------------------------------------------------------------------------- |
| `VITE_MERCHANT_ADDRESS` | Yes      | Solana address that receives the payments.                                    |
| `VITE_MERCHANT_NAME`    | Yes      | Shown to the student when paying (Solana Pay `label`). At most 40 characters. |

`src/config/env.ts` validates them at startup. Both end up in the browser bundle and in the QR code: they're public.

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

## Known issues

- Anyone with access to the device can change the merchant's address in `.env.local`. Fine for a controlled demo; phase 2 moves it to the merchant registry.
- The app doesn't detect the payment yet: "Esperando pago…" never changes.
