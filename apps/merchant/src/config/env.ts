/**
 * Environment variables, loaded and validated by Varlock at build time (see
 * `.env.schema`). A missing or invalid value fails `vite dev` / `vite build`.
 *
 * Everything here ends up in the browser bundle: never put secrets in it.
 */
import { address } from "@solana/kit";
import { ENV as VARLOCK_ENV } from "varlock/env";

export const ENV = {
  /**
   * Wallet that receives the payments. `address()` checks it decodes to 32
   * bytes (the schema's regex can't) and brands it as Kit's `Address`.
   */
  merchantAddress: address(VARLOCK_ENV.VITE_MERCHANT_ADDRESS),
  /** Shown to the student when paying, e.g. "Cafetería Central". */
  merchantName: VARLOCK_ENV.VITE_MERCHANT_NAME,
  /** Solana devnet RPC. */
  solanaRpcUrl: VARLOCK_ENV.VITE_SOLANA_RPC_URL,
  /** Solana devnet WebSocket, to detect payments as they land. */
  solanaWsUrl: VARLOCK_ENV.VITE_SOLANA_WS_URL,
} as const;
