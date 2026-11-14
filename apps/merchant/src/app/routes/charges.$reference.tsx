import { isAddress } from "@solana/kit";
import {
  createFileRoute,
  type SearchSchemaInput,
} from "@tanstack/react-router";

import { DeadEndCard } from "#/components/dead-end-card";
import { merchant } from "#/config/merchant";
import { ChargePayment } from "#/features/charge/components/charge-payment";
import {
  type ChargeSearch,
  toChargeDetails,
  validateChargeSearch,
} from "#/features/charge/utils/charge-search";
import { createCharge } from "#/features/charge/utils/create-charge";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/charges/$reference")({
  params: {
    // An invalid reference doesn't match the route: "not found".
    parse: ({ reference }) => (isAddress(reference) ? { reference } : false),
    stringify: ({ reference }) => ({ reference }),
  },
  // `SearchSchemaInput`: navigating here takes a `ChargeSearch`, while the
  // route gets the validated one.
  validateSearch: (search: ChargeSearch & SearchSchemaInput) =>
    validateChargeSearch(search),
  component: ChargeScreen,
});

function ChargeScreen() {
  const { reference } = Route.useParams();
  const { amount, concept } = Route.useSearch();
  const navigate = Route.useNavigate();

  const charge =
    amount === undefined
      ? null
      : createCharge({
          merchant,
          reference,
          ...toChargeDetails({ amount, concept }),
        });

  if (!charge) {
    return (
      <DeadEndCard
        title={m.merchant_invalid_charge_title()}
        description={m.merchant_invalid_charge_description()}
      />
    );
  }

  return (
    <ChargePayment
      key={charge.url}
      charge={charge}
      // Replace: back or forward never bring a closed charge back.
      onClose={() => void navigate({ to: "/", replace: true })}
    />
  );
}
