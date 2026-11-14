import { createFileRoute } from "@tanstack/react-router";

import { useConnectedAccount } from "#/app/connected-account";
import { AccountCard } from "#/features/account/components/account-card";
import { BalanceCard } from "#/features/balance/components/balance-card";
import { MetricsCard } from "#/features/metrics/components/metrics-card";
import { PaymentLinkForm } from "#/features/pay/components/payment-link-form";
import { toPaymentLink } from "#/features/pay/utils/payment-link";

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

function Home() {
  const { address } = useConnectedAccount();
  const navigate = Route.useNavigate();

  return (
    <>
      <BalanceCard owner={address} />
      <PaymentLinkForm
        payer={address}
        onScan={() => void navigate({ to: "/scan" })}
        onRequest={(request) =>
          void navigate({
            to: "/pay",
            search: { link: toPaymentLink(request) },
          })
        }
      />
      <AccountCard address={address} />
      <MetricsCard />
    </>
  );
}
