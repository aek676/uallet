import { isSignature, type Signature } from "@solana/kit";
import { z } from "zod";

import { createSampleStore } from "@repo/payments/sample-store";

/** How long each stage of a payment took, as the student lived it. */
export interface PaymentTiming {
  signature: Signature;
  /** `Date.now()` when the student tapped "Pay". */
  startedAt: number;
  /** Tap to ready to sign: instructions, blockhash and simulation. */
  prepareMs: number;
  /** The wallet signing. */
  signMs: number;
  /** Signed to confirmed by the network: sending and waiting. */
  confirmMs: number;
}

/** From the tap to "Payment complete". */
export function totalMs(timing: PaymentTiming): number {
  return timing.prepareMs + timing.signMs + timing.confirmMs;
}

const duration = z.number().nonnegative();

const paymentTimingSchema = z.object({
  signature: z.custom<Signature>(
    (value) => typeof value === "string" && isSignature(value),
  ),
  startedAt: z.number().positive(),
  prepareMs: duration,
  signMs: duration,
  confirmMs: duration,
});

/** The last payments made from this device. */
export const paymentTimings = createSampleStore<PaymentTiming>({
  key: "uallet:wallet:payment-timings:v1",
  limit: 50,
  parse: (value) => paymentTimingSchema.safeParse(value).data ?? null,
});
