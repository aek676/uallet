import {
  isFailedSingleTransactionPlanResult,
  isSolanaError,
  isTransactionPlanResult,
  SOLANA_ERROR__FAILED_TO_SEND_TRANSACTION,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SOLANA_ERROR__INSTRUCTION_ERROR__INVALID_ACCOUNT_DATA,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  type Signature,
} from "@solana/kit";

import { m } from "#/paraglide/messages.js";

/**
 * - `no-funds`, `no-sol`, `failed`: the money didn't move, trying again is safe.
 * - `unknown`: the transaction was signed and may have been sent, but we don't
 *   know how it ended. Trying again could pay twice.
 */
export type PaymentFailure =
  | { kind: "no-funds" }
  | { kind: "no-sol" }
  | { kind: "failed" }
  | { kind: "unknown"; signature: Signature };

/** `InsufficientFunds` in the Token programs; also a System program error. */
const INSUFFICIENT_FUNDS_CODE = 1;

function causesOf(error: unknown): unknown[] {
  const chain: unknown[] = [];
  for (let current = error; current instanceof Error; current = current.cause) {
    chain.push(current);
  }
  return chain;
}

function failedResultOf(error: unknown) {
  if (!isSolanaError(error, SOLANA_ERROR__FAILED_TO_SEND_TRANSACTION)) {
    return null;
  }
  const result = error.context.transactionPlanResult;
  return isTransactionPlanResult(result) &&
    isFailedSingleTransactionPlanResult(result)
    ? result
    : null;
}

/**
 * The network ran the transaction and rejected it, as opposed to errors that
 * say nothing about its fate (a dropped connection, a timeout...). Kit groups
 * these codes in ranges: see `@solana/errors`.
 */
function isRejectedByNetwork(error: unknown): boolean {
  if (!isSolanaError(error)) return false;
  const { __code: code }: { __code: number } = error.context;
  return (
    (code >= 4_615_000 && code < 4_616_000) ||
    (code >= 7_050_000 && code < 7_051_000)
  );
}

/** Classifies what `sendTransaction` threw for a payment. */
export function classifyPaymentFailure(error: unknown): PaymentFailure {
  const chain = causesOf(error);
  const result = failedResultOf(error);
  // The transfer is always the last instruction.
  const instructions = result?.context.message?.instructions.length;
  const transferIndex = instructions === undefined ? null : instructions - 1;

  for (const cause of chain) {
    if (
      isSolanaError(
        cause,
        SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
      ) ||
      isSolanaError(
        cause,
        SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
      ) ||
      isSolanaError(
        cause,
        SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
      )
    ) {
      return { kind: "no-sol" };
    }
    // No token account yet: the student never received the token.
    if (
      isSolanaError(
        cause,
        SOLANA_ERROR__INSTRUCTION_ERROR__INVALID_ACCOUNT_DATA,
      )
    ) {
      return { kind: "no-funds" };
    }
    if (
      isSolanaError(cause, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
      cause.context.code === INSUFFICIENT_FUNDS_CODE
    ) {
      // Before the transfer it comes from creating the merchant's token
      // account: the System program couldn't charge the rent.
      return {
        kind:
          transferIndex !== null && cause.context.index === transferIndex
            ? "no-funds"
            : "no-sol",
      };
    }
  }

  const signature = result?.context.signature;
  if (signature && !chain.some(isRejectedByNetwork)) {
    // Includes `BLOCK_HEIGHT_EXCEEDED`: conservative on purpose, students
    // check their balance before paying again.
    return { kind: "unknown", signature };
  }
  return { kind: "failed" };
}

const FAILURE_MESSAGES: Record<PaymentFailure["kind"], () => string> = {
  "no-funds": m.payment_failure_no_funds,
  "no-sol": m.payment_failure_no_sol,
  failed: m.payment_failure_failed,
  unknown: m.payment_failure_unknown,
};

export function paymentFailureMessage(failure: PaymentFailure): string {
  return FAILURE_MESSAGES[failure.kind]();
}
