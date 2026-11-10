import { type Address, getBase64Encoder } from "@solana/kit";
import {
  useAccount,
  useClusterState,
  useSolanaClient,
} from "@solana/react-hooks";
import { useEffect, useEffectEvent } from "react";
import useSWR from "swr";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import {
  decodeTokenAccount,
  getAssociatedTokenAddress,
} from "@repo/payments/token-account";

const RPC_TIMEOUT_MS = 10_000;

interface PaymentTokenBalance {
  ata: Address;
  amount: bigint;
}

type SolanaClient = ReturnType<typeof useSolanaClient>;

/**
 * We don't use `useSplToken`: its fetch swallows every RPC error and returns
 * a balance of 0, so a timeout would show "0,00 €" instead of an error.
 */
async function fetchPaymentTokenBalance(
  client: SolanaClient,
  owner: Address,
): Promise<PaymentTokenBalance> {
  const ata = await getAssociatedTokenAddress(owner, PAYMENT_TOKEN);
  const { value } = await client.runtime.rpc
    .getAccountInfo(ata, {
      commitment: client.store.getState().cluster.commitment,
      encoding: "base64",
    })
    .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });

  if (!value) {
    return { ata, amount: 0n };
  }

  if (value.owner !== PAYMENT_TOKEN.programAddress) {
    throw new Error(`Token account ${ata} is owned by ${value.owner}`);
  }

  const account = decodeTokenAccount(getBase64Encoder().encode(value.data[0]));
  if (account.mint !== PAYMENT_TOKEN.mint || account.owner !== owner) {
    throw new Error(`Token account ${ata} is not ${owner}'s for the mint`);
  }

  return { ata, amount: account.amount };
}

/**
 * Balance of the payment token (`PAYMENT_TOKEN`) for `owner`, kept live.
 *
 * SWR refetches on focus and reconnect. We also watch the ATA over WebSocket
 * and refetch when it changes, which covers the first deposit too: the
 * subscription fires when the ATA is created.
 */
export function usePaymentTokenBalance(owner: Address | undefined) {
  const client = useSolanaClient();
  const { endpoint, commitment } = useClusterState();

  const { data, error, isValidating, mutate } = useSWR<
    PaymentTokenBalance,
    unknown,
    readonly [string, string, string, Address, Address] | null
  >(
    owner
      ? [
          "payment-token-balance",
          endpoint,
          commitment,
          PAYMENT_TOKEN.mint,
          owner,
        ]
      : null,
    ([, , , , ownerAddress]) => fetchPaymentTokenBalance(client, ownerAddress),
  );

  // Only a change signal: the cached account data has a different shape when
  // it comes from a fetch or from the subscription, so we refetch instead of
  // decoding it.
  const ata = useAccount(data?.ata, { watch: true, fetch: false });

  // `mutate()` without data revalidates: errors land in `error`, never thrown.
  const refresh = () => void mutate();

  const onAtaChange = useEffectEvent(refresh);
  const slot = ata?.slot;
  useEffect(() => {
    if (slot != null) onAtaChange();
  }, [slot]);

  return {
    /** `undefined` until the first successful fetch. */
    amount: data?.amount,
    error,
    refreshing: isValidating,
    refresh,
  };
}
