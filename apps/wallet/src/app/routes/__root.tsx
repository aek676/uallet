import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

// Dev only: the condition is replaced at build time, so the import (a
// devDependency) is dropped from the production bundle.
const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : () => null;

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="font-semibold">Uallet</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Outlet />
      </main>
      <Suspense>
        <RouterDevtools />
      </Suspense>
    </div>
  );
}

function NotFound() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Esta página no existe</CardTitle>
        <CardDescription>
          Puede que el enlace esté mal escrito o que ya no exista.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          className="w-full"
          nativeButton={false}
          render={<Link to="/" />}
        >
          Ir al inicio
        </Button>
      </CardFooter>
    </Card>
  );
}
