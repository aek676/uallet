/**
 * Environment variables, loaded and validated by Varlock at build time (see
 * `.env.schema`). A missing or invalid value fails `vite dev` / `vite build`
 * instead of failing at payment time.
 *
 * Everything here ends up in the browser bundle: never put secrets in it.
 *
 * Varlock's Vite plugin inlines the values by rewriting the literal text
 * `ENV.<KEY>`: keep the import named `ENV`, an alias isn't rewritten.
 */
import { ENV } from "varlock/env";

const config = {
  /** MetaMask Embedded Wallets client ID. Public by design. */
  web3AuthClientId: ENV.VITE_WEB3AUTH_CLIENT_ID,
  /** Solana devnet RPC. */
  solanaRpcUrl: ENV.VITE_SOLANA_RPC_URL,
  /** Solana devnet WebSocket, to listen for confirmations. */
  solanaWsUrl: ENV.VITE_SOLANA_WS_URL,
} as const;

export { config as ENV };
