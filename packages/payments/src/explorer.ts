import type { Signature } from "@solana/kit";

/** The transaction in the Solana Explorer. Both apps run on devnet. */
export function getExplorerTransactionUrl(signature: Signature): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
