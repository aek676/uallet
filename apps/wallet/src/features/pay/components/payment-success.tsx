import type { Signature } from "@solana/kit";
import { CircleCheckIcon, ExternalLinkIcon } from "lucide-react";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { getExplorerTransactionUrl } from "@repo/payments/explorer";
import type { TransferRequest } from "@repo/payments/solana-pay";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { formatDuration, formatEuros } from "#/lib/format";
import { m } from "#/paraglide/messages.js";
import { type PaymentTiming, totalMs } from "#/stores/payment-timings";

type PaymentSuccessProps = {
  request: TransferRequest;
  signature: Signature;
  timing: PaymentTiming | null;
  onDone: () => void;
};

export function PaymentSuccess({
  request,
  signature,
  timing,
  onDone,
}: PaymentSuccessProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex flex-col items-center gap-2 text-center">
        <CircleCheckIcon className="size-12 text-primary" aria-hidden />
        <CardTitle>{m.success_title()}</CardTitle>
        {timing && (
          <p className="text-sm text-muted-foreground">
            {m.success_duration({ duration: formatDuration(totalMs(timing)) })}
          </p>
        )}
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
          {m.view_in_explorer()}
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onDone}>
          {m.success_done()}
        </Button>
      </CardFooter>
    </Card>
  );
}
