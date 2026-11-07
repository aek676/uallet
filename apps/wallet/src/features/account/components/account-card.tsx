import { useWalletSession } from "@solana/react-hooks";
import {
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/no-modal/react";
import { CopyIcon, LoaderCircleIcon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

import { shortenAddress } from "#/utils/shorten-address";

export function AccountCard() {
  const { userInfo } = useWeb3AuthUser();
  const session = useWalletSession();
  const web3AuthDisconnect = useWeb3AuthDisconnect();

  const address = session?.account.address.toString();

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Dirección copiada");
    } catch {
      toast.error("No se ha podido copiar la dirección");
    }
  }

  async function logout() {
    await web3AuthDisconnect.disconnect();
    // Reload so the next login starts from a fresh SDK. In
    // @web3auth/no-modal 11.4.3, logging in again in the same page after a
    // logout completes the Google flow but never emits CONNECTED, so the
    // login form spins forever.
    window.location.reload();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Tu wallet</CardTitle>
        <CardDescription>
          {userInfo?.email ?? userInfo?.name ?? "Sesión iniciada"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          Dirección de Solana (devnet)
        </span>
        {address ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <span className="font-mono text-sm" title={address}>
              {shortenAddress(address)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copiar dirección"
              onClick={() => void copyAddress()}
            >
              <CopyIcon />
            </Button>
          </div>
        ) : (
          <Skeleton className="h-11 w-full" />
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          disabled={web3AuthDisconnect.loading}
          onClick={() => void logout()}
        >
          {web3AuthDisconnect.loading ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <LogOutIcon />
          )}
          Cerrar sesión
        </Button>
      </CardFooter>
    </Card>
  );
}
