import type { Signature } from "@solana/kit";
import { LoaderCircleIcon } from "lucide-react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { getExplorerTransactionUrl } from "@repo/payments/explorer";
import { formatEuros } from "@repo/payments/format";
import type { TransferRequest } from "@repo/payments/solana-pay";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import {
  type PaymentFailure,
  paymentFailureMessage,
} from "#/features/pay/utils/payment-failure";
import { solanaDevnet } from "#/lib/web3auth";

type PaymentConfirmationProps = {
  request: TransferRequest;
  paying: boolean;
  failure: PaymentFailure | null;
  /** A payment for this charge already on chain, if any. */
  earlierPayment: Signature | null;
  onPay: () => void;
  onCancel: () => void;
};

export function PaymentConfirmation({
  request,
  paying,
  failure,
  earlierPayment,
  onPay,
  onCancel,
}: PaymentConfirmationProps) {
  const { amount, label, message, recipient } = request;
  // It may have gone through, or it already did: paying again would charge
  // twice. While paying, a payment that shows up is ours.
  const alreadyPaid = earlierPayment !== null && !paying;
  const canPay = failure?.kind !== "unknown" && !alreadyPaid;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Confirma el pago</CardTitle>
        <p className="text-5xl font-semibold tabular-nums">
          {formatEuros(amount, PAYMENT_TOKEN.decimals)}
        </p>
        {message && (
          <p className="wrap-break-word text-muted-foreground">{message}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Para</dt>
            <dd className="font-medium wrap-break-word">
              {label ?? "Sin nombre"}
            </dd>
            <dd className="font-mono text-xs break-all">{recipient}</dd>
            <dd className="text-xs text-muted-foreground">
              El nombre lo escribe quien cobra: no está verificado.
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Token y red</dt>
            <dd>
              {PAYMENT_TOKEN.symbol} en {solanaDevnet.displayName}
            </dd>
          </div>
        </dl>
        {alreadyPaid && !failure && (
          <div role="alert" className="text-sm text-destructive">
            <p>
              Este cobro ya está pagado. Si no lo has pagado tú, pide al
              comercio un cobro nuevo.
            </p>
            <a
              href={getExplorerTransactionUrl(earlierPayment)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Ver el pago en el Explorer
            </a>
          </div>
        )}
        {failure && !paying && (
          <div role="alert" className="text-sm text-destructive">
            <p>{paymentFailureMessage(failure)}</p>
            {failure.kind === "unknown" && (
              <a
                href={getExplorerTransactionUrl(failure.signature)}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Ver en el Explorer
              </a>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1"
          disabled={paying}
          onClick={onCancel}
        >
          {canPay ? "Cancelar" : "Volver"}
        </Button>
        {canPay && (
          <Button className="flex-1" disabled={paying} onClick={onPay}>
            {paying && <LoaderCircleIcon className="animate-spin" />}
            {paying ? "Pagando…" : "Pagar"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
