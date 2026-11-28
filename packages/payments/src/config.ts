import { type Address, address } from "@solana/kit";

/** Classic SPL Token program. */
export const TOKEN_PROGRAM_ADDRESS = address(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

/** Token-2022 (Token Extensions) program. */
export const TOKEN_2022_PROGRAM_ADDRESS = address(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

export interface Token {
  mint: Address;
  decimals: number;
  symbol: string;
  /**
   * Program that owns the mint. Needed to derive token accounts (ATAs) and to
   * build transfer instructions: never assume the classic Token program.
   */
  programAddress:
    | typeof TOKEN_PROGRAM_ADDRESS
    | typeof TOKEN_2022_PROGRAM_ADDRESS;
}

/** EURC by Circle. Same mint address on Solana mainnet and devnet. */
export const EURC = {
  mint: address("HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr"),
  decimals: 6,
  symbol: "EURC",
  programAddress: TOKEN_PROGRAM_ADDRESS,
} as const satisfies Token;

/**
 * Token used for campus payments. Apps must use this, never `EURC` directly,
 * so switching to the UAL token (Token-2022) is a one-line change.
 */
export const PAYMENT_TOKEN: Token = EURC;

export interface MerchantRegistry {
  authority: Address;
  credential: Address;
  schema: Address;
}

export const MERCHANT_CREDENTIAL_NAME = "Uallet";
export const MERCHANT_SCHEMA_NAME = "merchant";
export const MERCHANT_SCHEMA_VERSION = 1;

export const MERCHANT_REGISTRY: MerchantRegistry = {
  authority: address("E7WGiiArvJQXHBbBB25SrZN1GTXaqmx4nwG8Yg7jLvSc"),
  credential: address("9vSq9z7RyXEuLwj69yNNFrpXeASebhxe8w1PQw1ucMBh"),
  schema: address("6VR4Nz3bVbrwqdjg6PqFyxsx6fKKiYTXAoeq6xrqaqGB"),
};
