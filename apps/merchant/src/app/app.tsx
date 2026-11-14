import { RouterProvider } from "@tanstack/react-router";

import { AppProvider } from "#/app/provider";
import { router } from "#/app/router";

export function App() {
  // Providers outside the router, so every route can use them.
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
