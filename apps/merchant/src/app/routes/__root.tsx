import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { DeadEndCard } from "#/components/dead-end-card";
import { merchant } from "#/config/merchant";
import { MetricsCard } from "#/features/metrics/components/metrics-card";

const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }] =
        await Promise.all([
          import("@tanstack/react-devtools"),
          import("@tanstack/react-router-devtools"),
        ]);
      const plugins = [
        { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
      ];
      return { default: () => <TanStackDevtools plugins={plugins} /> };
    })
  : () => null;

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="font-semibold">
          {merchant.name}
          <span className="font-normal text-muted-foreground"> · Uallet</span>
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Outlet />
        <MetricsCard />
      </main>
      <Suspense>
        <Devtools />
      </Suspense>
    </div>
  );
}

function NotFound() {
  return (
    <DeadEndCard
      title="Esta página no existe"
      description="Puede que el enlace esté mal escrito o incompleto."
    />
  );
}
