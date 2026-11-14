import type { TransactionSigner } from "@solana/kit";
import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";

import type { TransferRequest } from "@repo/payments/solana-pay";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { BalanceCard } from "#/features/balance/components/balance-card";
import { PaymentConfirmation } from "#/features/pay/components/payment-confirmation";
import { PaymentSuccess } from "#/features/pay/components/payment-success";
import { useEarlierPayment } from "#/features/pay/hooks/use-earlier-payment";
import { usePayment } from "#/features/pay/hooks/use-payment";
import { paySearchSchema } from "#/features/pay/utils/pay-search";
import { createPaymentLinkSchema } from "#/features/pay/utils/payment-link";
import { useConnectedAccount } from "#/hooks/use-connected-account";

const INVALID_LINK = "Este enlace no es un cobro válido.";

export const Route = createFileRoute("/_authenticated/pay")({
  validateSearch: paySearchSchema,
  component: Pay,
});

function Pay() {
  const { link } = Route.useSearch();
  const { address, signer } = useConnectedAccount();
  const navigate = Route.useNavigate();
  // Memoized: `useEarlierPayment` checks again for each new request object.
  const result = useMemo(
    () => createPaymentLinkSchema(address).safeParse(link),
    [link, address],
  );

  if (!result.success) {
    // An empty link isn't something to paste here: say it's not a charge.
    const message =
      link.trim() === ""
        ? INVALID_LINK
        : (result.error.issues[0]?.message ?? INVALID_LINK);
    return <InvalidLink message={message} />;
  }

  return (
    <>
      <BalanceCard owner={address} />
      {/* Keyed: another link is another payment, from scratch. */}
      <Charge
        key={link}
        request={result.data}
        signer={signer}
        onClose={() => void navigate({ to: "/", replace: true })}
      />
    </>
  );
}

function InvalidLink({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>No se puede pagar este cobro</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          className="w-full"
          nativeButton={false}
          render={<Link to="/" replace />}
        >
          Volver
        </Button>
      </CardFooter>
    </Card>
  );
}

type ChargeProps = {
  request: TransferRequest;
  signer: TransactionSigner;
  onClose: () => void;
};

function Charge({ request, signer, onClose }: ChargeProps) {
  const { pay, paying, signature, timing, failure } = usePayment(signer);

  // A sent payment can't be cancelled: leaving or reloading now would hide
  // how it ended, which decides whether paying again is safe.
  useBlocker({
    shouldBlockFn: () => {
      toast.info("Espera a que termine el pago.");
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

  return (
    <ChargeConfirmation
      request={request}
      paying={paying}
      failure={failure}
      onPay={() => pay(request)}
      onCancel={onClose}
    />
  );
}

/** The confirmation, checking meanwhile whether the charge is already paid. */
function ChargeConfirmation(
  props: Omit<Parameters<typeof PaymentConfirmation>[0], "earlierPayment">,
) {
  const earlierPayment = useEarlierPayment(props.request);
  return <PaymentConfirmation {...props} earlierPayment={earlierPayment} />;
}
