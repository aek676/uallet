/**
 * Validated environment variables. Fails at startup instead of at payment
 * time. To be replaced by Varlock.
 *
 * Everything here ends up in the browser bundle: never put secrets in it.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy apps/wallet/.env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function url(name: string, value: string, protocols: string[]): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error(`${name} is not a valid URL: "${value}"`, { cause: error });
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}: "${value}"`);
  }
  return value;
}

export const env = {
  /** MetaMask Embedded Wallets client ID. Public by design. */
  web3AuthClientId: required(
    "VITE_WEB3AUTH_CLIENT_ID",
    import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
  ),
  /** Solana devnet RPC. Defaults to the public (rate-limited) endpoint. */
  solanaRpcUrl: url(
    "VITE_SOLANA_RPC_URL",
    import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    ["https:", "http:"],
  ),
  /** Solana devnet WebSocket, to listen for confirmations. */
  solanaWsUrl: url(
    "VITE_SOLANA_WS_URL",
    import.meta.env.VITE_SOLANA_WS_URL || "wss://api.devnet.solana.com",
    ["wss:", "ws:"],
  ),
} as const;
