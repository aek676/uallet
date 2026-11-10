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
import { BalanceCard } from "#/features/balance/components/balance-card";
import { useSolanaAccount } from "#/hooks/use-solana-account";

function LoadErrorScreen() {
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

function WalletScreen() {
  const account = useSolanaAccount();

  if (account.status === "error") {
    return <LoadErrorScreen />;
  }

  if (account.status === "connecting") {
    return <LoadingScreen />;
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <BalanceCard owner={account.address} />
      <AccountCard address={account.address} />
    </div>
  );
}

function Screen() {
  const { isInitialized, initError, isConnected } = useWeb3Auth();

  if (initError) {
    return <LoadErrorScreen />;
  }

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isConnected) {
    return <LoginForm />;
  }

  return <WalletScreen />;
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
