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

In development they come from Infisical: follow the one-time setup in the [root README](../../README.md#environment-variables). They are declared in [`.env.schema`](.env.schema):

| Variable                  | Notes                                                         |
| ------------------------- | ------------------------------------------------------------- |
| `VITE_WEB3AUTH_CLIENT_ID` | Client ID from the dashboard.                                 |
| `VITE_SOLANA_RPC_URL`     | Solana devnet RPC (shared with merchant, in the root schema). |
| `VITE_SOLANA_WS_URL`      | Solana devnet WebSocket (shared, in the root schema).         |

Varlock validates them when Vite starts: `dev` and `build` fail instead of the app failing at payment time.

**Everything here ends up in the browser bundle.** The client ID is public by design (the allowed origins protect it). A dedicated RPC URL embeds an API key: restrict it to your domains in the provider's dashboard.

### 3. Run

```sh
aube run dev --filter wallet
```

## Test funds (devnet)

Log in, copy your address from the app and request:

- **SOL** for network fees: [faucet.solana.com](https://faucet.solana.com)
- **EURC** to pay with: [faucet.circle.com](https://faucet.circle.com) (EURC, Solana Devnet)

## Routes

[TanStack Router](https://tanstack.com/router) with file-based routes in `src/app/routes` (the Vite plugin regenerates `src/app/route-tree.gen.ts` on `dev` and `build`; it's committed). The URL says which screen is open; a payment in flight, its signature and timing stay in React.

| Path          | Screen                                                      |
| ------------- | ----------------------------------------------------------- |
| `/`           | Balance, paste a link or open the scanner, account, metrics |
| `/scan`       | The QR scanner                                              |
| `/pay?link=…` | Confirmation and result of paying the `solana:` link        |
| (any other)   | Not found, with a link home                                 |

- **Login on a deep link.** Every screen sits behind `_authenticated`, a layout that shows the login form in place of the screen instead of redirecting. Login is a popup, so a `/pay?link=…` opened while logged out is still there after logging in.
- **The link is checked again on `/pay`**, with the same schema as when pasting or scanning: a URL can be typed by anyone. An invalid one shows why and a way back.
- **Back and refresh.** A scanned code replaces `/scan` in the history, and leaving `/pay` replaces it with `/`, so back doesn't reopen the camera or the charge. Refreshing `/pay` after paying shows the confirmation again, without **Pay**: the device remembers the payments it sent (`sentPayments`, the last 50 in `localStorage`), so it says the charge is paid, or that we don't know how the payment ended, without waiting for the RPC.
- **While paying, navigation is blocked** (back, links, and reload or close with the browser's prompt): the outcome of a sent payment decides whether paying again is safe.

A static deploy must serve `index.html` for every path (SPA fallback), or a refresh or deep link outside `/` returns 404. `dev` and `preview` already do it.

## Languages

English by default, Spanish as an option. The language is the one picked in the header menu, else the browser's if it's Spanish, else English. Changing it reloads the page.

- The texts and the [Paraglide JS](https://paraglidejs.com) project live in [`@repo/i18n`](../../packages/i18n/README.md), with the `wallet_` prefix for this app's. This app compiles them into `src/paraglide` (git-ignored): the Vite plugin on `dev`, `build` and `test`, and `codegen` for `lint`.
- `m.<key>()` from `#/paraglide/messages.js` returns a text in the current language.
- Amounts, numbers and dates go through `#/lib/format`, in `en-US` or `es-ES`.
- Texts built outside a render (Zod errors, lookup tables) are functions, so they come out in the language at the time they're used.
- Tests run outside a browser, so they get English.
- Paraglide also saves the detected language on the first visit (`localStorage`, `uallet:locale`): a device keeps the language it first opened with until someone picks another.
- Web3Auth's own screens (the email code) get the app's language through `uiConfig.defaultLanguage`.

## Paying

1. **Scan QR code** (`/scan`) or paste the `solana:` link on `/`, from the [merchant app](../merchant/README.md).
2. The link is checked (`createPaymentLinkSchema`): it must be a Solana Pay transfer request in `PAYMENT_TOKEN`, with a `reference`, without a memo and not to yourself. The wallet then opens `/pay?link=…` with it.
3. The confirmation screen shows the amount, the concept, the merchant name and its **full** address. Meanwhile it asks once whether a successful transaction already mentions the charge's `reference`: if so, it says the charge is already paid, links it and hides **Pay**.
4. **Pay** builds the payment (`buildPaymentInstructions`), signs it with the Web3Auth wallet and sends it through our RPC as a v0 transaction, waiting for `confirmed`. The success screen says how long it took.

No priority fee is added: devnet isn't congested, so its effect can't be measured there (confirmation already takes ~0.8 s without it). To decide on mainnet.

The student pays the network fee (~5,000 lamports), plus the rent of the merchant's token account the first time anyone pays that merchant (~0.0015 SOL).

If a payment fails, the screen says whether the money moved:

| Message                                          | Paying again                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Not enough EURC / not enough SOL / not paid      | Safe                                                                                                   |
| "We don't know whether the payment went through" | Disabled: the transaction was signed and may have landed. Check the balance or the Explorer link first |

### Scanner

The reader (`barcode-detector` ponyfill + `zxing-wasm`) and its `.wasm` (~414 kB gzip) load only when the scanner opens, and the `.wasm` is served from the app, not a CDN. `zxing-wasm` is pinned in the catalog to the exact version `barcode-detector` uses.

### On a phone

The camera only works in a secure context: `localhost` or HTTPS. To try the app on a phone, expose the dev server through an HTTPS tunnel with [OpenTunnel](https://opentunnel.xyz):

```sh
curl -fsSL https://opentunnel.xyz/install | sh   # once, installs to ~/.local/bin
aube run dev --filter wallet
opentunnel route add localhost:5173     # prints https://<route>.<tunnel>.opentunnel.xyz
```

- Use `localhost:5173`, not a bare `5173`: a bare port means `127.0.0.1`, and Vite may listen only on `::1`.
- The route is saved and its URL stays the same: add it once, `opentunnel status` shows it again. Keep the random route name (no `--name`): the route name is what keeps the URL private, and anyone with it reaches your dev server.
- Add that origin to the **allowed origins** in the MetaMask Embedded Wallets dashboard, or login fails.
- Vite already accepts `*.opentunnel.xyz` hosts (`server.allowedHosts` in [`vite.config.ts`](vite.config.ts)); any other tunnel needs its host added there.
- `opentunnel route remove <route>` or `opentunnel down` when you're done.

To pay from the phone, tunnel the [merchant](../merchant/README.md#on-a-phone-or-tablet) too, or show its QR code on your computer's screen.

## Metrics

Each payment records how long it took from the tap, by stage, and the last 50 stay on the device (`localStorage`). The **Metrics** card at the bottom shows the median and p95 of each stage and the last payments, with a button to clear them.

| Stage   | What it covers                                  |
| ------- | ----------------------------------------------- |
| Prepare | Building the transaction, blockhash, simulation |
| Sign    | The Web3Auth wallet signing                     |
| Confirm | Sending it and waiting for `confirmed`          |

Measured on devnet's public RPC (39 payments of 0.01 EURC, in two runs, from a desktop browser):

| Stage   | p50     | p95     | max    |
| ------- | ------- | ------- | ------ |
| Total   | ~1.0 s  | ~1.2 s  | 3.9 s  |
| Prepare | ~170 ms | ~200 ms | 204 ms |
| Sign    | 10 ms   | 21 ms   | 55 ms  |
| Confirm | ~800 ms | ~1.1 s  | 3.7 s  |

## Known issues

- **Web3Auth signs without asking.** The confirmation screen is the student's only check, so it shows the full address and warns that the merchant name isn't verified: whoever creates the link writes it. Verified merchants come with the merchant registry (phase 2).
- **The "already paid" check is best effort.** It answers about 1.3 s after the confirmation shows up and doesn't wait for it, so a fast tap can still pay twice, and so can two devices paying at the same time. A failed check doesn't block paying. Payments sent from this device don't depend on it (`sentPayments`), except one whose page was reloaded or closed mid-payment despite the browser's prompt: it isn't recorded until it ends. Anyone can mention a reference in a transaction, so someone else can make a charge look paid: the message tells the student to ask for a new one.
- Web3Auth's wallet only signs `legacy` and v0 transactions, so payments can't use v1 yet.

- Only the email form checks for a university address (`@ual.es`, `@inlumine.ual.es`), and only client-side. Google accepts any account. The real restriction belongs in the dashboard (a Google connection limited to the university domain).
- Logging out reloads the page: in `@web3auth/no-modal` 11.4.3, logging in again in the same page after a logout never emits `CONNECTED`.
