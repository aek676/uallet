import { createClient } from "@solana/kit";
import { solanaRpcConnection } from "@solana/kit-plugin-rpc";

import { ENV } from "#/config/env";

/**
 * Read-only Kit client: the merchant never signs, it only watches for
 * payments over RPC and WebSocket subscriptions.
 */
export const solanaClient = createClient().use(
  solanaRpcConnection({
    rpcUrl: ENV.solanaRpcUrl,
    rpcSubscriptionsUrl: ENV.solanaWsUrl,
  }),
);

export type SolanaClient = typeof solanaClient;
