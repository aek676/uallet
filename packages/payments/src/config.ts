import { address } from "@solana/kit";

/** EURC by Circle. Same mint address on Solana mainnet and devnet. */
export const EURC = {
  mint: address("HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr"),
  decimals: 6,
  symbol: "EURC",
} as const;
