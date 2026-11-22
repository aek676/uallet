import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { DeadEndCard } from "#/components/dead-end-card";
import { BalanceCard } from "#/features/balance/components/balance-card";
import { PayCharge } from "#/features/pay/components/pay-charge";
import { paySearchSchema } from "#/features/pay/utils/pay-search";
import { checkPaymentLink } from "#/features/pay/utils/payment-link";
import { useConnectedAccount } from "#/hooks/use-connected-account";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_authenticated/pay")({
  validateSearch: paySearchSchema,
  component: Pay,
});

function Pay() {
  const { link } = Route.useSearch();
  const { address } = useConnectedAccount();
  const navigate = Route.useNavigate();
  // Memoized: `PayCharge` checks again whether it's paid for each new request
  // object.
  const result = useMemo(
    () => checkPaymentLink(link, address),
    [link, address],
  );

  if (!result.success) {
    return (
      <DeadEndCard
        title={m.wallet_cannot_pay_title()}
        description={result.message}
      />
    );
  }

  return (
    <>
      <BalanceCard owner={address} />
      {/* Keyed: another link is another payment, from scratch. */}
      <PayCharge
        key={link}
        request={result.request}
        onClose={() => void navigate({ to: "/", replace: true })}
      />
    </>
  );
}
