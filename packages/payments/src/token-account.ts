import {
  type Address,
  address,
  getAddressDecoder,
  getAddressEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getU64Decoder,
  type ReadonlyUint8Array,
} from "@solana/kit";

import type { Token } from "./config";

/** Associated Token Account program. Same for classic Token and Token-2022. */
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

/**
 * Size of a classic token account. Token-2022 accounts share this base
 * layout and append their extensions after it, so they are never smaller.
 */
export const TOKEN_ACCOUNT_SIZE = 165;

/** Address of `owner`'s associated token account (ATA) for `token`. */
export async function getAssociatedTokenAddress(
  owner: Address,
  token: Pick<Token, "mint" | "programAddress">,
): Promise<Address> {
  const encoder = getAddressEncoder();
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [
      encoder.encode(owner),
      encoder.encode(token.programAddress),
      encoder.encode(token.mint),
    ],
  });
  return ata;
}

export interface TokenAccount {
  mint: Address;
  owner: Address;
  amount: bigint;
}

// First fields of the base layout, identical in both token programs.
const tokenAccountDecoder = getStructDecoder([
  ["mint", getAddressDecoder()],
  ["owner", getAddressDecoder()],
  ["amount", getU64Decoder()],
]);

/**
 * Decodes the fields we need from token account data. The caller must check
 * that the account is owned by the expected token program: these bytes are
 * only meaningful then.
 */
export function decodeTokenAccount(data: ReadonlyUint8Array): TokenAccount {
  if (data.length < TOKEN_ACCOUNT_SIZE) {
    throw new RangeError(
      `Not a token account: ${data.length} bytes, expected at least ${TOKEN_ACCOUNT_SIZE}`,
    );
  }
  return tokenAccountDecoder.decode(data);
}
