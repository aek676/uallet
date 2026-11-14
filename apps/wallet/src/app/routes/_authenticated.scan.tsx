import { createFileRoute } from "@tanstack/react-router";

import { BalanceCard } from "#/features/balance/components/balance-card";
import { QrScanner } from "#/features/pay/components/qr-scanner";
import { toPaymentLink } from "#/features/pay/utils/payment-link";
import { useConnectedAccount } from "#/hooks/use-connected-account";

export const Route = createFileRoute("/_authenticated/scan")({
  component: Scan,
});

function Scan() {
  const { address } = useConnectedAccount();
  const navigate = Route.useNavigate();

  // Both replace the scanner in the history: going back must not turn the
  // camera on again.
  return (
    <>
      <BalanceCard owner={address} />
      <QrScanner
        payer={address}
        onRequest={(request) =>
          void navigate({
            to: "/pay",
            search: { link: toPaymentLink(request) },
            replace: true,
          })
        }
        onCancel={() => void navigate({ to: "/", replace: true })}
      />
    </>
  );
}
