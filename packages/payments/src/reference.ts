import { type Address, getAddressDecoder } from "@solana/kit";

/**
 * Creates a random Solana Pay `reference`: an address nobody owns, added as a
 * read-only account to the payment transaction so the merchant can find it.
 *
 * Nobody signs with it, so random bytes are enough (no keypair needed).
 */
export function createReference(): Address {
  return getAddressDecoder().decode(crypto.getRandomValues(new Uint8Array(32)));
}
