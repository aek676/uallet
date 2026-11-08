import type { TransactionSigner } from "@solana/kit";
import { useAction } from "@solana/react";
import { useMemo } from "react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import type { TransferRequest } from "@repo/payments/solana-pay";
import { buildPaymentInstructions } from "@repo/payments/transfer";

import { classifyPaymentFailure } from "#/features/pay/utils/payment-failure";
import { createPaymentClient } from "#/lib/payment-client";

/**
 * Sends a payment and waits for `confirmed`. Never retries on its own: only
 * the student can decide to try again, after seeing what happened.
 */
export function usePayment(signer: TransactionSigner) {
  const client = useMemo(() => createPaymentClient(signer), [signer]);

  // `useAction`'s abort signal isn't forwarded on purpose: once a payment is
  // on its way it can't be cancelled, and we always want to know how it ended.
  const { dispatch, data, error, isRunning, reset } = useAction(
    async (_signal: AbortSignal, request: TransferRequest) => {
      const instructions = await buildPaymentInstructions({
        request,
        payer: signer,
        token: PAYMENT_TOKEN,
      });
      const result = await client.sendTransaction(instructions);
      return result.context.signature;
    },
  );

  return {
    pay: dispatch,
    paying: isRunning,
    signature: data,
    failure: error === undefined ? null : classifyPaymentFailure(error),
    reset,
  };
}
