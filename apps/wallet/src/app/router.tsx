import { createRouter } from "@tanstack/react-router";

import { routeTree } from "#/app/route-tree.gen";
import { LoadErrorScreen } from "#/components/load-error-screen";
import { LoadingScreen } from "#/components/loading-screen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  // Route code loads on demand: a chunk that fails to load (offline, or a
  // deploy since the page opened) is what this screen's reload fixes.
  defaultErrorComponent: LoadErrorScreen,
  defaultPendingComponent: LoadingScreen,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
