import { createFileRoute } from "@tanstack/react-router";

import { ChargeForm } from "#/features/charge/components/charge-form";
import { toChargeSearch } from "#/features/charge/utils/charge-search";

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
