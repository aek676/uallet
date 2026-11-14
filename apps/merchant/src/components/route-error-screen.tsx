import { DeadEndCard } from "#/components/dead-end-card";
import { m } from "#/paraglide/messages.js";

export function RouteErrorScreen() {
  return (
    <DeadEndCard
      title={m.route_error_title()}
      description={m.merchant_route_error_description()}
    />
  );
}
