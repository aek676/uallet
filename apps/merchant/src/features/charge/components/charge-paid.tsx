import { CircleCheckIcon, ExternalLinkIcon } from "lucide-react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { getExplorerTransactionUrl } from "@repo/payments/explorer";
import { formatEuros } from "@repo/payments/format";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import type { Charge } from "#/features/charge/utils/create-charge";
import type { DetectedPayment } from "#/features/charge/utils/wait-for-payment";

type ChargePaidProps = {
  charge: Charge;
  payment: DetectedPayment;
  onDone: () => void;
};

export function ChargePaid({ charge, payment, onDone }: ChargePaidProps) {
  const { amount, message } = charge.request;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex flex-col items-center gap-2 text-center">
        <CircleCheckIcon className="size-16 text-primary" aria-hidden />
        <CardTitle className="text-2xl">Pagado</CardTitle>
        <p className="text-5xl font-semibold tabular-nums">
          {formatEuros(amount, PAYMENT_TOKEN.decimals)}
        </p>
        {message && (
          <p className="wrap-break-word text-muted-foreground">{message}</p>
        )}
      </CardHeader>
      <CardContent className="flex justify-center text-sm">
        <a
          href={getExplorerTransactionUrl(payment.signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-4"
        >
          Ver en el Explorer
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full" onClick={onDone}>
          Nuevo cobro
        </Button>
      </CardFooter>
    </Card>
  );
}
