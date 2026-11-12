/**
 * Environment variables, loaded and validated by Varlock at build time (see
 * `.env.schema`). A missing or invalid value fails `vite dev` / `vite build`
 * instead of failing at payment time.
 *
 * Everything here ends up in the browser bundle: never put secrets in it.
 */
import { ENV as VARLOCK_ENV } from "varlock/env";

export const ENV = {
  /** MetaMask Embedded Wallets client ID. Public by design. */
  web3AuthClientId: VARLOCK_ENV.VITE_WEB3AUTH_CLIENT_ID,
  /** Solana devnet RPC. */
  solanaRpcUrl: VARLOCK_ENV.VITE_SOLANA_RPC_URL,
  /** Solana devnet WebSocket, to listen for confirmations. */
  solanaWsUrl: VARLOCK_ENV.VITE_SOLANA_WS_URL,
} as const;
