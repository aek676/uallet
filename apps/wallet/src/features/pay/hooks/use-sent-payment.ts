import { useSyncExternalStore } from "react";

import type { TransferRequest } from "@repo/payments/solana-pay";

import {
  findSentPayment,
  type SentPayment,
  sentPayments,
} from "#/features/pay/stores/sent-payments";

/** The last payment this device sent for `request`, if any. */
export function useSentPayment(request: TransferRequest): SentPayment | null {
  const payments = useSyncExternalStore(
    sentPayments.subscribe,
    sentPayments.getSnapshot,
  );
  return findSentPayment(payments, request);
}
