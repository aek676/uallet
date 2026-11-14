import { RouterProvider } from "@tanstack/react-router";

import { AppProvider } from "#/app/provider";
import { router } from "#/app/router";

export function App() {
  // Providers outside the router, so routes can use Web3Auth and Solana hooks.
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
