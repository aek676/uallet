import type { Signature } from "@solana/kit";
import { CircleCheckIcon, ExternalLinkIcon } from "lucide-react";

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

import { getExplorerTransactionUrl } from "#/lib/explorer";

type PaymentSuccessProps = {
  request: TransferRequest;
  signature: Signature;
  onDone: () => void;
};

export function PaymentSuccess({
  request,
  signature,
  onDone,
}: PaymentSuccessProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex flex-col items-center gap-2 text-center">
        <CircleCheckIcon className="size-12 text-primary" aria-hidden />
        <CardTitle>Pago realizado</CardTitle>
        <p className="text-5xl font-semibold tabular-nums">
          {formatEuros(request.amount, PAYMENT_TOKEN.decimals)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 text-sm">
        {request.label && (
          <p className="wrap-break-word text-muted-foreground">
            {request.label}
          </p>
        )}
        <a
          href={getExplorerTransactionUrl(signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-4"
        >
          Ver en el Explorer
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onDone}>
          Hecho
        </Button>
      </CardFooter>
    </Card>
  );
}
