import { LoadErrorScreen } from "#/components/load-error-screen";

/**
 * Any error while showing a route: a bug, or route code that didn't load
 * (offline, or a deploy since the page opened). Reloading fixes the latter.
 */
export function RouteErrorScreen() {
  return (
    <LoadErrorScreen
      title="Algo ha fallado"
      description="No hemos podido mostrar esta pantalla. Vuelve a intentarlo."
    />
  );
}
