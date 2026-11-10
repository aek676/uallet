import { createClient } from "@solana/kit";
import { solanaRpcConnection } from "@solana/kit-plugin-rpc";

import { env } from "#/config/env";

/**
 * Kit client for the whole app: RPC and WebSocket subscriptions, from our
 * env. Read-only for now.
 *
 * Signing comes with payments: `.use(signer(...)).use(solanaRpc({ ...,
 * transactionConfig: { version: 0 } }))`, with a signer built from the
 * Web3Auth wallet account. Web3Auth's wallet only signs `legacy` and v0
 * transactions, not v1.
 */
export const solanaClient = createClient().use(
  solanaRpcConnection({
    rpcUrl: env.solanaRpcUrl,
    rpcSubscriptionsUrl: env.solanaWsUrl,
  }),
);

export type SolanaClient = typeof solanaClient;
