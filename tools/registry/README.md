# `registry`

Command-line tools to manage the merchant registry on Solana devnet. Not deployed, and nothing here reaches a browser.

## The registry

Being a merchant means having an attestation from the university on the [Solana Attestation Service](https://attest.solana.com) (SAS, program `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG`). It lives on-chain so the wallet can check a merchant against the chain itself, without trusting the API: a compromised API can't invent a merchant or a name.

| Account     | What it is                                                         | Address (PDA) derived from                         |
| ----------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Credential  | `Uallet`: the university's authority and its authorized signers.   | `"credential"`, the authority, the name            |
| Schema      | `merchant` v1: one `String` field, `name` (at most 40 characters). | `"schema"`, the credential, the name, the version  |
| Attestation | One per merchant: "this address is a merchant called _name_".      | `"attestation"`, the credential, the schema, nonce |

The nonce is the merchant's address, so its attestation can be found from the address alone. Attestations never expire (`expiry` 0): removing a merchant closes its attestation. SAS can't update one, so renaming closes it and creates it again, in the same transaction: the merchant is never unregistered in between. Names are stored in NFC (`merchant:add` normalizes what you type), without control or invisible characters.

Anyone can send SOL to the address of a merchant's attestation or token account before it exists. That doesn't block anything: SAS and the ATA program both create over such an account, and the plans treat it as missing.

SAS doesn't invalidate an attestation when its signer is removed from the credential, and the reader doesn't check who signed one. Today the authority is the only signer; before removing a signer (the planned admin app, #55), close the attestations it signed: their `signer` field says who.

The addresses are `MERCHANT_REGISTRY` in [`@repo/payments/config`](../../packages/payments/src/config.ts), and the reader the wallet and the API use is [`@repo/payments/merchant-registry`](../../packages/payments/src/merchant-registry.ts).

Registering also creates the merchant's associated token account for `PAYMENT_TOKEN`, if missing, so the first payment never has to (the sponsored fee payer won't create accounts).

## Setup

Needs Bun 1.4.x on your `PATH` (it runs the commands, as in `apps/api`) and the Infisical setup from the [root README](../../README.md#environment-variables).

| Variable                     | Notes                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLANA_RPC_URL`             | Devnet RPC. From Infisical, the same secret the apps read.                                                                                                                   |
| `REGISTRY_AUTHORITY_KEYPAIR` | Keypair file of the credential's authority, which signs and pays every change. Default `~/.config/uallet/registry-authority-devnet.json`. Only the writing commands read it. |

The authority's keypair is the most sensitive key of the system: whoever has it can register fake merchants. Keep the file outside the repo, readable only by you (`chmod 600`), and don't share it. Its address is `MERCHANT_REGISTRY.authority`; the commands refuse to run with another keypair. On devnet it needs a little SOL for rent (about 0.002 SOL per merchant, back when it's removed): top it up at [faucet.solana.com](https://faucet.solana.com).

## Commands

```sh
aube run --filter registry merchant:show -- --address <merchant address>
aube run --filter registry merchant:add -- --address <merchant address> --name "Cafetería Central"
aube run --filter registry merchant:remove -- --address <merchant address>
```

- `merchant:show`: what the wallet and the API will see: the verified name, or why it isn't a merchant. Reads only, no keypair.
- `merchant:add`: registers or renames a merchant and creates its token account. Running it again with the same name changes nothing.
- `merchant:remove`: closes the attestation; the rent goes back to the authority. The merchant's token account and balance stay.
- `registry:init`: creates the credential and the schema, once. Already done on devnet; only for a new registry (another cluster, a new authority). It prints the addresses for `MERCHANT_REGISTRY`.

## Code

```text
src/commands/   one file per command, run with Bun; each imports varlock/auto-load first
src/lib/        arguments, the Kit clients, checks shared by the commands
src/config/     the env, the only module that imports varlock/env
```

The commands only fetch accounts, sign and send: what to send comes from `planMerchantRegistration` and `planMerchantRemoval` in [`@repo/payments/merchant-registry`](../../packages/payments/src/merchant-registry.ts), with their tests. An admin app would use the same plans, signed by the admin's own wallet.

Transactions are v0 and go through `SOLANA_RPC_URL`, signed and paid by the authority. The SAS client is [`@solana/attestation`](https://www.npmjs.com/package/@solana/attestation) (Kit 8), formerly `sas-lib`, which stays on Kit 5.

```sh
aube run test --filter registry
```
