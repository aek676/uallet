import type { Signature } from "@solana/kit";

export function getExplorerTransactionUrl(signature: Signature): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
