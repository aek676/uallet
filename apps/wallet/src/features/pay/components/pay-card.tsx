import type { TransactionSigner } from "@solana/kit";
import { useState } from "react";

import type { TransferRequest } from "@repo/payments/solana-pay";

import { PaymentConfirmation } from "#/features/pay/components/payment-confirmation";
import { PaymentLinkForm } from "#/features/pay/components/payment-link-form";
import { PaymentSuccess } from "#/features/pay/components/payment-success";
import { QrScanner } from "#/features/pay/components/qr-scanner";
import { usePayment } from "#/features/pay/hooks/use-payment";

export function PayCard({ signer }: { signer: TransactionSigner }) {
  const [request, setRequest] = useState<TransferRequest | null>(null);
  const [scanning, setScanning] = useState(false);
  const { pay, paying, signature, failure, reset } = usePayment(signer);

  function close() {
    reset();
    setRequest(null);
  }

  function open(next: TransferRequest) {
    setScanning(false);
    setRequest(next);
  }

  if (!request) {
    return scanning ? (
      <QrScanner
        payer={signer.address}
        onRequest={open}
        onCancel={() => setScanning(false)}
      />
    ) : (
      <PaymentLinkForm
        payer={signer.address}
        onRequest={open}
        onScan={() => setScanning(true)}
      />
    );
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
