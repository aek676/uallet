import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useWeb3Auth } from "@web3auth/no-modal/react";

import { LoadErrorScreen } from "#/components/load-error-screen";
import { LoadingScreen } from "#/components/loading-screen";
import { LoginForm } from "#/features/auth/components/login-form";
import { ConnectedAccountProvider } from "#/hooks/use-connected-account";
import { useSolanaAccount } from "#/hooks/use-solana-account";
import { useWarmApiSession } from "#/hooks/use-warm-api-session";
import type { IdTokenSource } from "#/lib/api-session";

/**
 * The login gate of every screen. It renders the login form in place of the
 * route instead of redirecting to a login route: Web3Auth's state comes from
 * hooks and initializes asynchronously, and this way the URL (a `/pay` deep
 * link, say) is still there after logging in, with no `?redirect=` to keep.
 * Login is a popup, so the page never leaves.
 */
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { web3Auth, isInitialized, initError, isConnected } = useWeb3Auth();

  if (initError) {
    return <LoadErrorScreen />;
  }

  // The provider creates `web3Auth` on mount, so it's never `null` here: the
  // check only narrows the type, once, for every screen behind the login.
  if (!isInitialized || !web3Auth) {
    return <LoadingScreen />;
  }

  if (!isConnected) {
    return <LoginForm />;
  }

  return <ConnectedLayout web3Auth={web3Auth} />;
}

function ConnectedLayout({ web3Auth }: { web3Auth: IdTokenSource }) {
  const account = useSolanaAccount();
  useWarmApiSession(
    web3Auth,
    account.status === "connected" ? account.address : undefined,
  );

  if (account.status === "error") {
    return <LoadErrorScreen />;
  }

  if (account.status === "connecting") {
    return <LoadingScreen />;
  }

  return (
    <ConnectedAccountProvider
      address={account.address}
      signer={account.signer}
      web3Auth={web3Auth}
    >
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Outlet />
      </div>
    </ConnectedAccountProvider>
  );
}
