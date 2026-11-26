import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useWeb3Auth } from "@web3auth/no-modal/react";

import { LoadErrorScreen } from "#/components/load-error-screen";
import { LoadingScreen } from "#/components/loading-screen";
import { LoginForm } from "#/features/auth/components/login-form";
import { ConnectedAccountProvider } from "#/hooks/use-connected-account";
import { useSolanaAccount } from "#/hooks/use-solana-account";
import { useWarmApiSession } from "#/hooks/use-warm-api-session";

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

  return <ConnectedLayout />;
}

function ConnectedLayout() {
  const account = useSolanaAccount();
  useWarmApiSession(
    account.status === "connected" ? account.address : undefined,
  );

  if (account.status === "error") {
    return <LoadErrorScreen />;
  }

  if (account.status === "connecting") {
    return <LoadingScreen />;
  }

  return (
    <ConnectedAccountProvider address={account.address} signer={account.signer}>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Outlet />
      </div>
    </ConnectedAccountProvider>
  );
}
