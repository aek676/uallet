import { type Address, isAddress } from "@solana/kit";

const MAX_NAME_LENGTH = 40;

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `Missing ${name}. Copy apps/merchant/.env.example to .env.local and fill it in.`,
    );
  }
  return trimmed;
}

function solanaAddress(name: string, value: string): Address {
  if (!isAddress(value)) {
    throw new Error(`${name} is not a valid Solana address: "${value}"`);
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

function maxLength(name: string, value: string, max: number): string {
  if (value.length > max) {
    throw new Error(`${name} must be at most ${max} characters: "${value}"`);
  }
  return value;
}

export const env = {
  /** Wallet that receives the payments. */
  merchantAddress: solanaAddress(
    "VITE_MERCHANT_ADDRESS",
    required("VITE_MERCHANT_ADDRESS", import.meta.env.VITE_MERCHANT_ADDRESS),
  ),
  /** Shown to the student when paying, e.g. "Cafetería Central". */
  merchantName: maxLength(
    "VITE_MERCHANT_NAME",
    required("VITE_MERCHANT_NAME", import.meta.env.VITE_MERCHANT_NAME),
    MAX_NAME_LENGTH,
  ),
  /** Solana devnet RPC. Defaults to the public (rate-limited) endpoint. */
  solanaRpcUrl: url(
    "VITE_SOLANA_RPC_URL",
    import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    ["https:", "http:"],
  ),
  /** Solana devnet WebSocket, to detect payments as they land. */
  solanaWsUrl: url(
    "VITE_SOLANA_WS_URL",
    import.meta.env.VITE_SOLANA_WS_URL || "wss://api.devnet.solana.com",
    ["wss:", "ws:"],
  ),
} as const;
