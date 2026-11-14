import { createRouter } from "@tanstack/react-router";

import { routeTree } from "#/app/route-tree.gen";
import { DeadEndCard } from "#/components/dead-end-card";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultErrorComponent: ErrorScreen,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function ErrorScreen() {
  return (
    <DeadEndCard
      title="Algo ha fallado"
      description="No hemos podido mostrar esta pantalla. Vuelve a empezar el cobro."
    />
  );
}
