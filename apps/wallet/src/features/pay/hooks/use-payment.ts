import type { TransactionSigner } from "@solana/kit";
import { useAction } from "@solana/react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import type { TransferRequest } from "@repo/payments/solana-pay";
import { buildPaymentInstructions } from "@repo/payments/transfer";

import { recordSentPayment } from "#/features/pay/stores/sent-payments";
import { classifyPaymentFailure } from "#/features/pay/utils/payment-failure";
import {
  type PaymentMarks,
  toPaymentTiming,
} from "#/features/pay/utils/payment-timing";
import { withSignTiming } from "#/features/pay/utils/timed-signer";
import { createPaymentClient } from "#/lib/payment-client";
import { paymentTimings } from "#/stores/payment-timings";

/**
 * Sends a payment and waits for `confirmed`. Never retries on its own: only
 * the student can decide to try again, after seeing what happened.
 *
 * It times each payment from the tap and keeps it in `paymentTimings`. A
 * payment that went out (confirmed, or `unknown`) goes to `sentPayments`.
 */
export function usePayment(signer: TransactionSigner) {
  // `useAction`'s abort signal isn't forwarded on purpose: once a payment is
  // on its way it can't be cancelled, and we always want to know how it ended.
  const { dispatch, data, error, isRunning } = useAction(
    async (_signal: AbortSignal, request: TransferRequest) => {
      const marks: PaymentMarks = { startedAt: Date.now() };
      // The same signer object for the fee payer and the instructions: Kit
      // rejects two different signers with one address.
      const timedSigner = withSignTiming(signer, {
        onStart: () => {
          marks.signStartedAt ??= Date.now();
        },
        onEnd: () => {
          marks.signedAt = Date.now();
        },
      });

      try {
        const instructions = await buildPaymentInstructions({
          request,
          payer: timedSigner,
          token: PAYMENT_TOKEN,
        });
        const result =
          await createPaymentClient(timedSigner).sendTransaction(instructions);
        const confirmedAt = Date.now();

        const { signature } = result.context;
        recordSentPayment(request, signature, true);
        const timing = toPaymentTiming(signature, marks, confirmedAt);
        if (timing) paymentTimings.add(timing);
        return { signature, timing };
      } catch (sendError) {
        const failure = classifyPaymentFailure(sendError);
        if (failure.kind === "unknown") {
          recordSentPayment(request, failure.signature, false);
        }
        throw sendError;
      }
    },
  );

  return {
    pay: dispatch,
    paying: isRunning,
    signature: data?.signature,
    /** `null` if the payment couldn't be timed. */
    timing: data?.timing ?? null,
    failure: error === undefined ? null : classifyPaymentFailure(error),
  };
}
