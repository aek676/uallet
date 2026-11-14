import { createRouter } from "@tanstack/react-router";

import { routeTree } from "#/app/route-tree.gen";
import { RouteErrorScreen } from "#/components/route-error-screen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultErrorComponent: RouteErrorScreen,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
