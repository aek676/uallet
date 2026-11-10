import type { Address, TokenBalance } from "@solana/kit";

import type { Token } from "./config";
import type { TransferRequest } from "./solana-pay";

/**
 * The fields of a `getTransaction` response (`json` encoding) that validation
 * reads. Kit's response (`GetTransactionApiResponseJson`) satisfies it.
 */
export interface PaymentTransaction {
  meta: {
    err: unknown;
    loadedAddresses?: {
      readonly: readonly Address[];
      writable: readonly Address[];
    };
    preTokenBalances?: readonly TokenBalance[];
    postTokenBalances?: readonly TokenBalance[];
  } | null;
  transaction: {
    message: { accountKeys: readonly Address[] };
  };
}

export type PaymentRejection =
  /** No metadata: the RPC can't say whether it succeeded. */
  | "no-status"
  | "failed"
  | "missing-reference"
  /** The merchant didn't receive exactly the amount of the request. */
  | "wrong-amount";

export type PaymentValidation =
  | { valid: true }
  | { valid: false; reason: PaymentRejection; received?: bigint };

function accountsOf({ meta, transaction }: PaymentTransaction): Set<Address> {
  return new Set([
    ...transaction.message.accountKeys,
    ...(meta?.loadedAddresses?.writable ?? []),
    ...(meta?.loadedAddresses?.readonly ?? []),
  ]);
}

/**
 * Sum of `balances` in the recipient's token accounts for the mint, on the
 * token's program. The RPC omits accounts that didn't exist yet, which count
 * as 0: the first payment to a merchant creates its token account.
 */
function sumReceivable(
  balances: readonly TokenBalance[] | undefined,
  recipient: Address,
  mint: Address,
  programAddress: Address,
): bigint {
  let total = 0n;
  for (const balance of balances ?? []) {
    if (
      balance.owner === recipient &&
      balance.mint === mint &&
      balance.programId === programAddress
    ) {
      total += BigInt(balance.uiTokenAmount.amount);
    }
  }
  return total;
}

/**
 * Checks that a finalized transaction pays a Solana Pay transfer request:
 * it succeeded, it includes every `reference`, and the recipient's token
 * accounts for the request's mint received exactly the amount.
 *
 * Reads balance changes instead of decoding the transfer instruction, so it
 * works with any transaction shape (e.g. a smart wallet's CPI). On-chain data
 * is untrusted: everything is compared against the request, never trusted.
 */
export function validatePayment(
  transaction: PaymentTransaction,
  request: Pick<
    TransferRequest,
    "recipient" | "amount" | "splToken" | "reference"
  >,
  token: Pick<Token, "programAddress">,
): PaymentValidation {
  if (request.amount <= 0n) {
    throw new RangeError(`Invalid payment amount: ${request.amount}`);
  }

  const { meta } = transaction;
  if (!meta) {
    return { valid: false, reason: "no-status" };
  }
  if (meta.err !== null) {
    return { valid: false, reason: "failed" };
  }

  const accounts = accountsOf(transaction);
  if (!request.reference.every((reference) => accounts.has(reference))) {
    return { valid: false, reason: "missing-reference" };
  }

  const args = [
    request.recipient,
    request.splToken,
    token.programAddress,
  ] as const;
  const received =
    sumReceivable(meta.postTokenBalances, ...args) -
    sumReceivable(meta.preTokenBalances, ...args);
  if (received !== request.amount) {
    return { valid: false, reason: "wrong-amount", received };
  }

  return { valid: true };
}
