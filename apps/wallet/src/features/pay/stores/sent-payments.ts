import {
  type Address,
  isAddress,
  isSignature,
  type Signature,
} from "@solana/kit";
import { z } from "zod";

import { createSampleStore } from "@repo/payments/sample-store";
import type { TransferRequest } from "@repo/payments/solana-pay";

/** A payment this device sent for a charge. */
export interface SentPayment {
  /** The charge's first reference, the one `findEarlierPayment` checks. */
  reference: Address;
  signature: Signature;
  /** `false`: we don't know how it ended, and it may have landed. */
  confirmed: boolean;
}

const sentPaymentSchema = z.object({
  reference: z.custom<Address>(
    (value) => typeof value === "string" && isAddress(value),
  ),
  signature: z.custom<Signature>(
    (value) => typeof value === "string" && isSignature(value),
  ),
  confirmed: z.boolean(),
});

/**
 * The last payments sent from this device, so reloading `/pay` still knows
 * the charge was paid, or may have been, without waiting for the RPC.
 */
export const sentPayments = createSampleStore<SentPayment>({
  key: "uallet:wallet:sent-payments:v1",
  limit: 50,
  parse: (value) => sentPaymentSchema.safeParse(value).data ?? null,
});

export function recordSentPayment(
  request: Pick<TransferRequest, "reference">,
  signature: Signature,
  confirmed: boolean,
) {
  const [reference] = request.reference;
  if (reference !== undefined) {
    sentPayments.add({ reference, signature, confirmed });
  }
}

/** The last payment this device sent for `request`, if any. */
export function findSentPayment(
  payments: readonly SentPayment[],
  request: Pick<TransferRequest, "reference">,
): SentPayment | null {
  const [reference] = request.reference;
  return (
    payments.findLast((payment) => payment.reference === reference) ?? null
  );
}
