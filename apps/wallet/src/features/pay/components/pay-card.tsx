import type { TransactionSigner } from "@solana/kit";
import { useState } from "react";

import type { TransferRequest } from "@repo/payments/solana-pay";

import { PaymentConfirmation } from "#/features/pay/components/payment-confirmation";
import { PaymentLinkForm } from "#/features/pay/components/payment-link-form";
import { PaymentSuccess } from "#/features/pay/components/payment-success";
import { usePayment } from "#/features/pay/hooks/use-payment";

export function PayCard({ signer }: { signer: TransactionSigner }) {
  const [request, setRequest] = useState<TransferRequest | null>(null);
  const { pay, paying, signature, failure, reset } = usePayment(signer);

  function close() {
    reset();
    setRequest(null);
  }

  if (!request) {
    return <PaymentLinkForm payer={signer.address} onRequest={setRequest} />;
  }

  if (signature) {
    return (
      <PaymentSuccess request={request} signature={signature} onDone={close} />
    );
  }

  return (
    <PaymentConfirmation
      request={request}
      paying={paying}
      failure={failure}
      onPay={() => pay(request)}
      onCancel={close}
    />
  );
}
