import { createClient } from "@solana/kit";
import { solanaRpcConnection } from "@solana/kit-plugin-rpc";

import { ENV } from "#/config/env";

/**
 * Read-only Kit client for the whole app: RPC and WebSocket subscriptions,
 * from our env. Payments are sent through it too (`usePayment`).
 */
export const solanaClient = createClient().use(
  solanaRpcConnection({
    rpcUrl: ENV.solanaRpcUrl,
    rpcSubscriptionsUrl: ENV.solanaWsUrl,
  }),
);

export type SolanaClient = typeof solanaClient;
