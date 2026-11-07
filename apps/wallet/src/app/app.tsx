import { useWalletSession } from "@solana/react-hooks";
import { useWeb3Auth } from "@web3auth/no-modal/react";
import { useEffect, useState } from "react";

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

/**
 * How long to wait for the Solana wallet session once Web3Auth is connected.
 * Normally it takes a couple of seconds.
 */
const WALLET_SESSION_TIMEOUT_MS = 15_000;

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

/**
 * Web3Auth can be connected while the Solana wallet session never arrives:
 * its `SolanaProvider` connects the wallet through our RPC and, if that
 * fails (RPC down, DNS error...), it only logs the error and leaves a client
 * without a wallet. Without a timeout the balance and address would show
 * skeletons forever.
 */
function WalletScreen() {
  const hasSession = useWalletSession() !== undefined;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (hasSession) return undefined;
    const timeout = setTimeout(
      () => setTimedOut(true),
      WALLET_SESSION_TIMEOUT_MS,
    );
    return () => {
      clearTimeout(timeout);
      setTimedOut(false);
    };
  }, [hasSession]);

  if (!hasSession && timedOut) {
    return <LoadErrorScreen />;
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <BalanceCard />
      <AccountCard />
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
