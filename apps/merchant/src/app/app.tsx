import { useState } from "react";

import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { AppProvider } from "#/app/provider";
import { merchant } from "#/config/merchant";
import { ChargeForm } from "#/features/charge/components/charge-form";
import { ChargeQr } from "#/features/charge/components/charge-qr";
import type { Charge } from "#/features/charge/utils/create-charge";

function Screen() {
  const [charge, setCharge] = useState<Charge | null>(null);

  if (charge) {
    return <ChargeQr charge={charge} onCancel={() => setCharge(null)} />;
  }

  return <ChargeForm onCharge={setCharge} />;
}

export function App() {
  return (
    <AppProvider>
      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="font-semibold">
            {merchant.name}
            <span className="font-normal text-muted-foreground"> · Uallet</span>
          </span>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <Screen />
        </main>
      </div>
    </AppProvider>
  );
}
