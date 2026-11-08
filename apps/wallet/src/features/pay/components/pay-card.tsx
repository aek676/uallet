import type { Address } from "@solana/kit";
import { useState } from "react";

import type { TransferRequest } from "@repo/payments/solana-pay";

import { PaymentConfirmation } from "#/features/pay/components/payment-confirmation";
import { PaymentLinkForm } from "#/features/pay/components/payment-link-form";

export function PayCard({ payer }: { payer: Address }) {
  const [request, setRequest] = useState<TransferRequest | null>(null);

  if (request) {
    return (
      <PaymentConfirmation
        request={request}
        onCancel={() => setRequest(null)}
      />
    );
  }

  return <PaymentLinkForm payer={payer} onRequest={setRequest} />;
}
