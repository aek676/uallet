import { PAYMENT_TOKEN } from "@repo/payments/config";
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

import { solanaDevnet } from "#/lib/web3auth";

type PaymentConfirmationProps = {
  request: TransferRequest;
  onCancel: () => void;
};

export function PaymentConfirmation({
  request,
  onCancel,
}: PaymentConfirmationProps) {
  const { amount, label, message, recipient } = request;

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
      <CardContent>
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
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="flex-1" disabled>
          Pagar
        </Button>
      </CardFooter>
    </Card>
  );
}
