import type { Address, Lamports } from "@solana/kit";
import { useClient, useTrackedData } from "@solana/react";
import { useMemo } from "react";

import { useLoadTimeout } from "#/features/balance/hooks/use-load-timeout";
import type { SolanaClient } from "#/lib/solana-client";

const LOAD_TIMEOUT_MS = 10_000;

export function useSolBalance(owner: Address) {
  const { rpc, rpcSubscriptions } = useClient<SolanaClient>();

  const spec = useMemo(
    () => ({
      initialValueSource: rpc.getBalance(owner, { commitment: "confirmed" }),
      initialValueMapper: (lamports: Lamports) => lamports,
      streamSource: rpcSubscriptions.accountNotifications(owner, {
        commitment: "confirmed",
      }),
      streamValueMapper: ({ lamports }: { lamports: Lamports }) => lamports,
    }),
    [rpc, rpcSubscriptions, owner],
  );

  const { data, error, refresh, status } = useTrackedData(spec);
  const timedOut = useLoadTimeout(status === "loading", LOAD_TIMEOUT_MS);

  return {
    lamports: data?.value,
    error:
      status === "error"
        ? error
        : timedOut
          ? new Error("Timed out loading the SOL balance")
          : undefined,
    refreshing: status === "loading" && !timedOut,
    refresh: () => refresh(),
  };
}
