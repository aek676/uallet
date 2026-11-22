# `@repo/payments`

Shared payment logic for the Uallet apps and the API. No UI and no network calls.

- `@repo/payments/config`: `PAYMENT_TOKEN`, the token used for payments (EURC for now, later the UAL Token-2022 token): mint, decimals and token program. Apps use `PAYMENT_TOKEN`, never `EURC` directly.
- `@repo/payments/amount`: convert between decimal amounts (`"1.20"`) and token base units (`1_200_000n`).
- `@repo/payments/reference`: random Solana Pay `reference` to find a payment on-chain.
- `@repo/payments/solana-pay`: the charge's link (the QR code), a Solana Pay [transaction request](https://solana.com/docs/tools/solana-pay/specification/version1#specification-transaction-request) to the API's `POST /pay` with the charge (`TransferRequest`) in its query. `encodeTransactionRequest` / `parseTransactionRequest` for the link, `toChargeQuery` / `parseChargeQuery` for the query, and `findTransferRequestProblem`, the checks that both the wallet and the API make before paying. A link is valid only if it points to the endpoint, so it is HTTPS whenever the endpoint is: the root `.env.schema` enforces that on `VITE_PAYMENT_REQUEST_URL`.
- `@repo/payments/transfer`: the payment's instructions (`buildPaymentInstructions`) and its compiled, unsigned v0 transaction (`buildPaymentTransaction`). The API builds it for the wallet and the wallet builds it again to compare the bytes before signing, so changing it changes both.
- `@repo/payments/validate-payment`: the merchant's check of a finalized payment, by balance changes.

```sh
aube run test --filter @repo/payments
```
