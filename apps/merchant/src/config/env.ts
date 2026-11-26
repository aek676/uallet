/**
 * Environment variables, loaded and validated by Varlock at build time (see
 * `.env.schema`). A missing or invalid value fails `vite dev` / `vite build`.
 *
 * Everything here ends up in the browser bundle: never put secrets in it.
 *
 * Varlock's Vite plugin inlines the values by rewriting the literal text
 * `ENV.<KEY>`: keep the import named `ENV`, an alias isn't rewritten.
 */
import { address } from "@solana/kit";
import { ENV } from "varlock/env";

const config = {
  /**
   * Wallet that receives the payments. `address()` checks it decodes to 32
   * bytes (the schema's regex can't) and brands it as Kit's `Address`.
   */
  merchantAddress: address(ENV.VITE_MERCHANT_ADDRESS),
  /** Shown to the student when paying, e.g. "Cafetería Central". */
  merchantName: ENV.VITE_MERCHANT_NAME,
  /** The API's payment endpoint: the QR is a transaction request to it. */
  paymentRequestUrl: ENV.VITE_PAYMENT_REQUEST_URL,
  /** Solana devnet RPC. */
  solanaRpcUrl: ENV.VITE_SOLANA_RPC_URL,
  /** Solana devnet WebSocket, to detect payments as they land. */
  solanaWsUrl: ENV.VITE_SOLANA_WS_URL,
} as const;

export { config as ENV };
