import type { Signature } from "@solana/kit";

import type { PaymentTiming } from "#/stores/payment-timings";

/** `Date.now()` at each step of a payment, filled in as it happens. */
export interface PaymentMarks {
  /** The student tapped "Pay". */
  startedAt: number;
  /** The wallet was asked to sign: the transaction is ready. */
  signStartedAt?: number;
  signedAt?: number;
}

// `Date.now()` can step back if the clock is adjusted mid-payment.
function elapsed(from: number, to: number): number {
  return Math.max(0, to - from);
}

/**
 * The stages of a confirmed payment, or `null` if signing wasn't timed (a
 * signer `withSignTiming` can't observe): better no sample than a wrong one.
 */
export function toPaymentTiming(
  signature: Signature,
  { startedAt, signStartedAt, signedAt }: PaymentMarks,
  confirmedAt: number,
): PaymentTiming | null {
  if (signStartedAt === undefined || signedAt === undefined) return null;

  return {
    signature,
    startedAt,
    prepareMs: elapsed(startedAt, signStartedAt),
    signMs: elapsed(signStartedAt, signedAt),
    confirmMs: elapsed(signedAt, confirmedAt),
  };
}
