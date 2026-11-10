import { createClient } from "@solana/kit";
import { solanaRpcConnection } from "@solana/kit-plugin-rpc";

import { env } from "#/config/env";

/**
 * Read-only Kit client for the whole app: RPC and WebSocket subscriptions,
 * from our env. Sending transactions: `createPaymentClient`.
 */
export const solanaClient = createClient().use(
  solanaRpcConnection({
    rpcUrl: env.solanaRpcUrl,
    rpcSubscriptionsUrl: env.solanaWsUrl,
  }),
);

export type SolanaClient = typeof solanaClient;
