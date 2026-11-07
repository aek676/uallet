import { useWeb3Auth } from "@web3auth/no-modal/react";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { AppProvider } from "#/app/provider";
import { LoadingScreen } from "#/components/loading-screen";
import { AccountCard } from "#/features/account/components/account-card";
import { LoginForm } from "#/features/auth/components/login-form";

function Screen() {
  const { isInitialized, initError, isConnected } = useWeb3Auth();

  if (initError) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>No se ha podido cargar la wallet</CardTitle>
          <CardDescription>
            Comprueba tu conexión a internet y vuelve a intentarlo.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return isConnected ? <AccountCard /> : <LoginForm />;
}

export function App() {
  return (
    <AppProvider>
      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="font-semibold">Uallet</span>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <Screen />
        </main>
      </div>
    </AppProvider>
  );
}
