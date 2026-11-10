import type { Signature } from "@solana/kit";
import { useClient } from "@solana/react";
import { useEffect, useState } from "react";

import type { TransferRequest } from "@repo/payments/solana-pay";

import { findEarlierPayment } from "#/features/pay/utils/earlier-payment";
import type { SolanaClient } from "#/lib/solana-client";

/** Charges have one payment: a handful is plenty. */
const LIMIT = 5;

/**
 * Whether `request` already looks paid, checked once while the student reads
 * the confirmation. It never delays paying: until it answers, and if it
 * fails, it's `null`.
 */
export function useEarlierPayment(request: TransferRequest): Signature | null {
  const { rpc } = useClient<SolanaClient>();
  const [found, setFound] = useState<{
    request: TransferRequest;
    signature: Signature;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    findEarlierPayment(
      request,
      (reference, abortSignal) =>
        rpc
          // `confirmed`: as soon as the wallet itself calls a payment done.
          .getSignaturesForAddress(reference, {
            commitment: "confirmed",
            limit: LIMIT,
          })
          .send({ abortSignal }),
      controller.signal,
    ).then(
      (signature) => {
        if (signature) setFound({ request, signature });
      },
      // Best effort: a failed check must not stop a payment.
      () => {},
    );
    return () => controller.abort();
  }, [request, rpc]);

  // Never report another charge's payment while checking this one.
  return found?.request === request ? found.signature : null;
}
