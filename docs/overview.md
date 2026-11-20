# Uallet

Uallet is a payment system for the University of Almería (UAL) campus. Members
of the university pay campus merchants from a wallet on their phone, with a
euro stablecoin on Solana.

## Why

Card terminals (TPV) make small payments expensive for merchants, so they set a
minimum purchase. On Solana the network fee is tiny and fixed whatever the
amount (about 5,000 lamports), and a payment confirms in about a second: a €0.50
coffee costs as little to process as a €50 purchase.

## Principle

Users shouldn't need to know they are using a blockchain. They should see
euros, a merchant's name and "Paid": no SOL, no addresses, no network fees. The
university will sponsor the network fee of every payment. Today's apps still
show SOL balances and addresses: see [Today and planned](#today-and-planned).

## How it works

1. **Top up** (planned). A member of the university pays euros into the campus bank
   account and receives the same amount of the campus token in their wallet.
2. **Pay.** The merchant types the amount and shows a QR code. The payer scans
   it and confirms.
3. **Get paid.** The merchant's screen shows "Paid" once the payment is final.
4. **Cash out** (planned). Only merchants can exchange the token for euros.

The campus token is a euro stablecoin (Token-2022), backed by the balance of the
bank account that receives the top-ups.

The campus token uses Token-2022 for its extensions, which give the issuer the
controls a campus currency needs:

- **Permanent delegate**: the issuer can move or burn tokens in any account.
- **Default account state (frozen)**: a new token account can't be used until
  the issuer enables it, so only approved members and merchants hold the token.

Which extensions the final token enables is still to be decided.

## Who uses it

- **Members of the university**: top up, hold and pay.
- **Campus merchants**: charge, and exchange what they receive for euros.

## Today and planned

| Area         | Today                                                                                   | Planned                            |
| ------------ | --------------------------------------------------------------------------------------- | ---------------------------------- |
| Network      | Solana devnet                                                                           | Mainnet                            |
| Token        | EURC as a stand-in, behind `PAYMENT_TOKEN`                                              | The campus Token-2022 stablecoin   |
| Network fee  | Paid by the payer, in SOL                                                               | Sponsored by the university        |
| Wallet       | Embedded wallet (email or Google login)                                                 | A smart wallet (non-custodial)     |
| Access       | Anyone who logs in (only the email form checks for a university address, in the client) | Members of the university          |
| Merchant     | No login: one address per device, from config                                           | Merchant registry and logins       |
| Verification | In the merchant's browser                                                               | Also in a backend                  |
| Top-up       | Faucets (test funds)                                                                    | Euros into the campus bank account |
| Cash out     | None                                                                                    | Merchants only                     |
| Issuer       | Circle (EURC)                                                                           | To be defined (issuing, cash-out)  |

## What's in the repo

- `apps/wallet`: the payer's app. See its [README](../apps/wallet/README.md).
- `apps/merchant`: the shop's app, which shows the QR. See its
  [README](../apps/merchant/README.md).
- `packages/payments`: the shared payment logic, with no UI and no network calls.
- `packages/ui`: the design system (shadcn/ui components and tokens).

How the pieces fit together, and why: [architecture.md](architecture.md).

## Glossary

| Term            | Meaning                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Charge          | What the merchant asks for: an amount, an optional concept and a fresh `reference`.                                       |
| Reference       | A random address added to the payment transaction so the merchant can find it on-chain. One per charge.                   |
| Solana Pay link | The `solana:` URL of a transfer request, shown as a QR. It carries recipient, amount, token, reference, label, message.   |
| Payment token   | The token payments use: `PAYMENT_TOKEN` in `@repo/payments/config`. EURC today, the campus token later.                   |
| Base units      | The token's smallest unit as a `bigint`: `1_200_000n` is €1.20 with 6 decimals.                                           |
| Look-back       | The merchant asking the RPC for transactions that mention the reference, in case the subscription dropped a notification. |
| `confirmed`     | A commitment level: voted on by a supermajority. Fast, used to announce a payment.                                        |
| `finalized`     | A commitment level: can't be reverted. Used to validate a payment.                                                        |
