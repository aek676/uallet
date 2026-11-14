import { createFileRoute } from "@tanstack/react-router";

import { toChargeSearch } from "#/app/charge-search";
import { ChargeForm } from "#/features/charge/components/charge-form";

export const Route = createFileRoute("/")({
  component: NewCharge,
});

function NewCharge() {
  const navigate = Route.useNavigate();

  return (
    <ChargeForm
      onCharge={(charge) => {
        // Push: back from the QR returns to the form, like "Cancelar".
        void navigate({
          to: "/charges/$reference",
          params: { reference: charge.reference },
          search: toChargeSearch(charge),
        });
      }}
    />
  );
}
