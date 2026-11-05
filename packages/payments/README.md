# `@repo/payments`

Shared payment logic for the Uallet apps. No UI and no network calls.

- `@repo/payments/config`: EURC mint and decimals.
- `@repo/payments/amount`: convert between decimal amounts (`"1.20"`) and token base units (`1_200_000n`).
- `@repo/payments/reference`: random Solana Pay `reference` to find a payment on-chain.
- `@repo/payments/solana-pay`: build and parse Solana Pay [transfer request](https://docs.solanapay.com/spec#transfer-request) links (the QR code).

```sh
aube run test --filter @repo/payments
```
