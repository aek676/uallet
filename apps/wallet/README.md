# `wallet`

The student wallet app: log in with email or Google through [MetaMask Embedded Wallets](https://docs.metamask.io/embedded-wallets/) (formerly Web3Auth), which creates a Solana wallet on first login. Runs on Solana devnet.

## Setup

### 1. MetaMask Embedded Wallets dashboard

In the [dashboard](https://developer.metamask.io/), create a project and configure it:

- **Network:** Sapphire Devnet. Sapphire Mainnet doesn't allow `localhost` origins.
- **Allowed origins:** `http://localhost:5173` (the dev server port is pinned in `vite.config.ts`).
- **Login methods:** email passwordless and Google.

Solana devnet doesn't need to be enabled in the dashboard: the chain is declared in `src/lib/web3auth.ts`, so the RPC comes from our env.

### 2. Environment variables

```sh
cp apps/wallet/.env.example apps/wallet/.env.local
```

| Variable                  | Required | Notes                                                               |
| ------------------------- | -------- | ------------------------------------------------------------------- |
| `VITE_WEB3AUTH_CLIENT_ID` | Yes      | Client ID from the dashboard.                                       |
| `VITE_SOLANA_RPC_URL`     | No       | Defaults to `https://api.devnet.solana.com` (public, rate-limited). |
| `VITE_SOLANA_WS_URL`      | No       | Defaults to `wss://api.devnet.solana.com`.                          |

`src/config/env.ts` validates them at startup: the app fails to load instead of failing at payment time.

**Everything here ends up in the browser bundle.** The client ID is public by design (the allowed origins protect it). A dedicated RPC URL embeds an API key: restrict it to your domains in the provider's dashboard.

### 3. Run

```sh
aube run dev --filter wallet
```

## Test funds (devnet)

Log in, copy your address from the app and request:

- **SOL** for network fees: [faucet.solana.com](https://faucet.solana.com)
- **EURC** to pay with: [faucet.circle.com](https://faucet.circle.com) (EURC, Solana Devnet)

## Paying

1. **Escanear QR** (or paste the `solana:` link) from the [merchant app](../merchant/README.md).
2. The link is checked (`createPaymentLinkSchema`): it must be a Solana Pay transfer request in `PAYMENT_TOKEN`, with a `reference`, without a memo and not to yourself.
3. The confirmation screen shows the amount, the concept, the merchant name and its **full** address. **Pagar** builds the payment (`buildPaymentInstructions`), signs it with the Web3Auth wallet and sends it through our RPC as a v0 transaction, waiting for `confirmed`.

The student pays the network fee (~5,000 lamports), plus the rent of the merchant's token account the first time anyone pays that merchant (~0.0015 SOL).

If a payment fails, the screen says whether the money moved:

| Message                                     | Paying again                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Not enough EURC / not enough SOL / not paid | Safe                                                                                                   |
| "No sabemos si el pago se ha completado"    | Disabled: the transaction was signed and may have landed. Check the balance or the Explorer link first |

### Scanner

The reader (`barcode-detector` ponyfill + `zxing-wasm`) and its `.wasm` (~414 kB gzip) load only when the scanner opens, and the `.wasm` is served from the app, not a CDN. `zxing-wasm` is pinned in the catalog to the exact version `barcode-detector` uses.

### On a phone

The camera only works in a secure context: `localhost` or HTTPS. To try the app on a phone, expose the dev server through an HTTPS tunnel, then:

- add the tunnel origin to the **allowed origins** in the MetaMask Embedded Wallets dashboard, or login fails;
- allow the tunnel host in Vite (`server.allowedHosts`), which rejects unknown hosts.

## Known issues

- **Web3Auth signs without asking.** The confirmation screen is the student's only check, so it shows the full address and warns that the merchant name isn't verified: whoever creates the link writes it. Verified merchants come with the merchant registry (phase 2).
- **The same charge can be paid twice.** Scanning or pasting a link that was already paid isn't detected. Checking the `reference` on-chain before paying would prevent it, at the cost of an extra RPC call per payment.
- Web3Auth's wallet only signs `legacy` and v0 transactions, so payments can't use v1 yet.

- Only the email form checks for a university address (`@ual.es`, `@inlumine.ual.es`), and only client-side. Google accepts any account. The real restriction belongs in the dashboard (a Google connection limited to the university domain).
- Logging out reloads the page: in `@web3auth/no-modal` 11.4.3, logging in again in the same page after a logout never emits `CONNECTED`.
