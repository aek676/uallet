import { isAddress } from "@solana/kit";
import {
  createFileRoute,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { useMemo } from "react";

import {
  type ChargeSearch,
  toChargeDetails,
  validateChargeSearch,
} from "#/app/charge-search";
import { DeadEndCard } from "#/app/dead-end-card";
import { merchant } from "#/config/merchant";
import { ChargePayment } from "#/features/charge/components/charge-payment";
import { createCharge } from "#/features/charge/utils/create-charge";

/**
 * A charge on screen. The URL holds everything that isn't config, so a
 * reload rebuilds the same charge and keeps watching for its payment: the
 * watcher looks back, so it finds a payment that landed meanwhile.
 */
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

  // `useChargePayment` depends on the charge's identity: rebuild it only when
  // the URL changes.
  const charge = useMemo(
    () =>
      amount === undefined
        ? null
        : createCharge({
            merchant,
            reference,
            ...toChargeDetails({ amount, concept }),
          }),
    [reference, amount, concept],
  );

  if (!charge) {
    return (
      <DeadEndCard
        title="Este cobro no es válido"
        description="Al enlace le falta el importe o se ha modificado. Crea el cobro de nuevo."
      />
    );
  }

  return (
    <ChargePayment
      key={charge.reference}
      charge={charge}
      // Replace: back or forward never bring a closed charge back.
      onClose={() => void navigate({ to: "/", replace: true })}
    />
  );
}
