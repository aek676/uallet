import type { TransactionSigner } from "@solana/kit";
import { useBlocker } from "@tanstack/react-router";
import { toast } from "sonner";

import type { TransferRequest } from "@repo/payments/solana-pay";

import { PaymentConfirmation } from "#/features/pay/components/payment-confirmation";
import { PaymentSuccess } from "#/features/pay/components/payment-success";
import { useEarlierPayment } from "#/features/pay/hooks/use-earlier-payment";
import { usePayment } from "#/features/pay/hooks/use-payment";
import { useSentPayment } from "#/features/pay/hooks/use-sent-payment";
import type { PaymentFailure } from "#/features/pay/utils/payment-failure";
import { m } from "#/paraglide/messages.js";

type PayChargeProps = {
  request: TransferRequest;
  signer: TransactionSigner;
  onClose: () => void;
};

/**
 * Paying a charge, from the confirmation to the result. Mount it with a new
 * `key` per charge: the payment lives as long as this component.
 */
export function PayCharge({ request, signer, onClose }: PayChargeProps) {
  const { pay, paying, signature, timing, failure } = usePayment(signer);
  const sent = useSentPayment(request);
  const earlierPayment = useEarlierPayment(request);

  // A sent payment can't be cancelled: leaving or reloading now would hide
  // how it ended, which decides whether paying again is safe.
  useBlocker({
    shouldBlockFn: () => {
      toast.info(m.wallet_payment_in_progress());
      return true;
    },
    enableBeforeUnload: true,
    disabled: !paying,
  });

  if (signature) {
    return (
      <PaymentSuccess
        request={request}
        signature={signature}
        timing={timing}
        onDone={onClose}
      />
    );
  }

  // After a reload, this device's record is all that's left of a payment it
  // sent: it hides "Pay" without waiting for `useEarlierPayment`.
  const sentFailure: PaymentFailure | null =
    sent && !sent.confirmed
      ? { kind: "unknown", signature: sent.signature }
      : null;

  return (
    <PaymentConfirmation
      request={request}
      paying={paying}
      failure={failure ?? sentFailure}
      earlierPayment={sent?.confirmed ? sent.signature : earlierPayment}
      onPay={() => pay(request)}
      onCancel={onClose}
    />
  );
}
