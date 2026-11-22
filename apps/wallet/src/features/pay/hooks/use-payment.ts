import { sendAndConfirmTransactionFactory } from "@solana/kit";
import { useAction, useClient } from "@solana/react";

import type { TransferRequest } from "@repo/payments/solana-pay";

import { recordSentPayment } from "#/features/pay/stores/sent-payments";
import { classifyPaymentFailure } from "#/features/pay/utils/payment-failure";
import {
  type PaymentMarks,
  toPaymentTiming,
} from "#/features/pay/utils/payment-timing";
import {
  requestPaymentTransaction,
  sendPayment,
} from "#/features/pay/utils/send-payment";
import { withSignTiming } from "#/features/pay/utils/timed-signer";
import { useConnectedAccount } from "#/hooks/use-connected-account";
import type { SolanaClient } from "#/lib/solana-client";
import { paymentTimings } from "#/stores/payment-timings";

/**
 * Pays a charge (`sendPayment`) and waits for `confirmed`. Never retries on
 * its own: only the student can decide to try again, after seeing what
 * happened.
 *
 * It times each payment from the tap and keeps it in `paymentTimings`. A
 * payment that went out (confirmed, or `unknown`) goes to `sentPayments`.
 *
 * It pays from the connected account (`useConnectedAccount`), so it only works
 * behind the login.
 */
export function usePayment() {
  const { signer, api } = useConnectedAccount();
  const { rpc, rpcSubscriptions } = useClient<SolanaClient>();

  // `useAction`'s abort signal isn't forwarded on purpose: once a payment is
  // on its way it can't be cancelled, and we always want to know how it ended.
  const { dispatch, data, error, isRunning } = useAction(
    async (_signal: AbortSignal, request: TransferRequest) => {
      const marks: PaymentMarks = { startedAt: Date.now() };
      const timedSigner = withSignTiming(signer, {
        onStart: () => {
          marks.signStartedAt ??= Date.now();
        },
        onEnd: () => {
          marks.signedAt = Date.now();
        },
      });

      try {
        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
          rpc,
          rpcSubscriptions,
        });

        const signature = await sendPayment({
          request,
          signer: timedSigner,
          requestTransaction: (charge) =>
            requestPaymentTransaction(api, charge, signer.address),
          getLatestBlockhash: async () => {
            const { value } = await rpc
              .getLatestBlockhash({ commitment: "confirmed" })
              .send();
            return value;
          },
          sendAndConfirm: (transaction) =>
            sendAndConfirmTransaction(transaction, { commitment: "confirmed" }),
        });
        const confirmedAt = Date.now();

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
