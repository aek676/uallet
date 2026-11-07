import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { AppProvider } from "#/app/provider";
import { merchant } from "#/config/merchant";

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
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Nuevo cobro</CardTitle>
              <CardDescription>
                Escribe el importe para generar el QR de pago.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    </AppProvider>
  );
}
