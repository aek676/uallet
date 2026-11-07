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

## Known issues

- Only the email form checks for a university address (`@ual.es`, `@inlumine.ual.es`), and only client-side. Google accepts any account. The real restriction belongs in the dashboard (a Google connection limited to the university domain).
- Logging out reloads the page: in `@web3auth/no-modal` 11.4.3, logging in again in the same page after a logout never emits `CONNECTED`.
