import type { Signature } from "@solana/kit";
import { LoaderCircleIcon } from "lucide-react";

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

import {
  type PaymentFailure,
  paymentFailureMessage,
} from "#/features/pay/utils/payment-failure";
import { formatEuros } from "#/lib/format";
import { solanaDevnet } from "#/lib/web3auth";
import { m } from "#/paraglide/messages.js";

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
        <CardTitle>{m.wallet_confirm_title()}</CardTitle>
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
            <dt className="text-muted-foreground">{m.wallet_confirm_to()}</dt>
            <dd className="font-medium wrap-break-word">
              {label ?? m.wallet_confirm_unnamed()}
            </dd>
            <dd className="font-mono text-xs break-all">{recipient}</dd>
            <dd className="text-xs text-muted-foreground">
              {m.wallet_confirm_name_unverified()}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {m.wallet_confirm_token_and_network()}
            </dt>
            <dd>
              {m.wallet_token_on_network({
                token: PAYMENT_TOKEN.symbol,
                network: solanaDevnet.displayName,
              })}
            </dd>
          </div>
        </dl>
        {alreadyPaid && !failure && (
          <div role="alert" className="text-sm text-destructive">
            <p>{m.wallet_confirm_already_paid()}</p>
            <a
              href={getExplorerTransactionUrl(earlierPayment)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              {m.wallet_confirm_view_payment()}
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
                {m.view_in_explorer()}
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
          {canPay ? m.cancel() : m.wallet_back()}
        </Button>
        {canPay && (
          <Button className="flex-1" disabled={paying} onClick={onPay}>
            {paying && <LoaderCircleIcon className="animate-spin" />}
            {paying ? m.wallet_confirm_paying() : m.wallet_confirm_pay()}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
