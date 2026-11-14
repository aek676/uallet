import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { LanguageMenu } from "@repo/ui/components/language-menu";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { DeadEndCard } from "#/components/dead-end-card";
import { merchant } from "#/config/merchant";
import { MetricsCard } from "#/features/metrics/components/metrics-card";
import { LANGUAGES } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";
import { getLocale, setLocale } from "#/paraglide/runtime.js";

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
        <div className="flex items-center gap-1">
          <LanguageMenu
            languages={LANGUAGES}
            value={getLocale()}
            // Saves the choice and reloads the page in that language.
            onValueChange={(locale) => void setLocale(locale)}
            label={m.language_menu_label()}
          />
          <ThemeToggle
            labels={{ toLight: m.theme_to_light(), toDark: m.theme_to_dark() }}
          />
        </div>
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
      title={m.not_found_title()}
      description={m.merchant_not_found_description()}
    />
  );
}
