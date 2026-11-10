import { isSignature, type Signature } from "@solana/kit";
import { z } from "zod";

import { createSampleStore } from "@repo/payments/sample-store";

const VIAS = ["notification", "look-back"] as const;

/** How the merchant app detected a payment, and how long checking it took. */
export interface ChargeTiming {
  signature: Signature;
  /**
   * What announced the transaction first: the subscription (the fast path)
   * or looking back, when the notification is late or never arrives.
   */
  via: (typeof VIAS)[number];
  /** `Date.now()` when the transaction was announced. */
  noticedAt: number;
  /** Announced to "Pagado": fetching the transaction and validating it. */
  validateMs: number;
}

export const VIA_LABELS: Record<ChargeTiming["via"], string> = {
  notification: "aviso",
  "look-back": "consulta",
};

export function toChargeTiming(payment: {
  signature: Signature;
  via: ChargeTiming["via"];
  noticedAt: number;
  detectedAt: number;
}): ChargeTiming {
  return {
    signature: payment.signature,
    via: payment.via,
    noticedAt: payment.noticedAt,
    // `Date.now()` can step back if the clock is adjusted meanwhile.
    validateMs: Math.max(0, payment.detectedAt - payment.noticedAt),
  };
}

const chargeTimingSchema = z.object({
  signature: z.custom<Signature>(
    (value) => typeof value === "string" && isSignature(value),
  ),
  via: z.enum(VIAS),
  noticedAt: z.number().positive(),
  validateMs: z.number().nonnegative(),
});

/** The last payments detected on this device. */
export const chargeTimings = createSampleStore<ChargeTiming>({
  key: "uallet:merchant:charge-timings:v1",
  limit: 50,
  parse: (value) => chargeTimingSchema.safeParse(value).data ?? null,
});
