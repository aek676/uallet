import type { Address } from "@solana/kit";
import { useWeb3Auth, useWeb3AuthUser } from "@web3auth/no-modal/react";
import { CopyIcon, LoaderCircleIcon, LogOutIcon } from "lucide-react";
import { useState } from "react";
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

import { waitForAuthorization } from "#/features/account/utils/wait-for-authorization";
import { solanaDevnet } from "#/lib/web3auth";
import { m } from "#/paraglide/messages.js";
import { shortenAddress } from "#/utils/shorten-address";

export function AccountCard({ address }: { address: Address }) {
  const { userInfo } = useWeb3AuthUser();
  const { web3Auth } = useWeb3Auth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(m.wallet_account_address_copied());
    } catch {
      toast.error(m.wallet_account_address_copy_failed());
    }
  }

  async function logout() {
    if (!web3Auth) return;
    setLoggingOut(true);
    try {
      // An API session being opened holds the SDK in `authorizing`, and
      // logging out then throws.
      await waitForAuthorization(web3Auth);
      await web3Auth.logout();
    } catch (error) {
      if (import.meta.env.DEV) console.warn("Couldn't log out", error);
      toast.error(m.wallet_account_log_out_failed());
      setLoggingOut(false);
      return;
    }
    // Reload so the next login starts from a fresh SDK. In
    // @web3auth/no-modal 11.4.3, logging in again in the same page after a
    // logout completes the Google flow but never emits CONNECTED, so the
    // login form spins forever. Only after a logout that worked: the session
    // would survive the reload.
    window.location.reload();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{m.wallet_account_title()}</CardTitle>
        <CardDescription>
          {userInfo?.email ?? userInfo?.name ?? m.wallet_account_signed_in()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {m.wallet_account_address_on({ network: solanaDevnet.displayName })}
        </span>
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <span className="font-mono text-sm" title={address}>
            {shortenAddress(address)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.wallet_account_copy_address()}
            onClick={() => void copyAddress()}
          >
            <CopyIcon />
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          disabled={loggingOut}
          onClick={() => void logout()}
        >
          {loggingOut ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <LogOutIcon />
          )}
          {m.wallet_account_log_out()}
        </Button>
      </CardFooter>
    </Card>
  );
}
