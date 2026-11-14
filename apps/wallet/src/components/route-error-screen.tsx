import { LoadErrorScreen } from "#/components/load-error-screen";
import { m } from "#/paraglide/messages.js";

/**
 * Any error while showing a route: a bug, or route code that didn't load
 * (offline, or a deploy since the page opened). Reloading fixes the latter.
 */
export function RouteErrorScreen() {
  return (
    <LoadErrorScreen
      title={m.route_error_title()}
      description={m.route_error_description()}
    />
  );
}
