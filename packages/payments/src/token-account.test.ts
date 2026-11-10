import { address, getAddressEncoder, getU64Encoder } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { EURC, TOKEN_2022_PROGRAM_ADDRESS } from "./config";
import {
  decodeTokenAccount,
  getAssociatedTokenAddress,
  TOKEN_ACCOUNT_SIZE,
} from "./token-account";

const OWNER = address("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

describe("getAssociatedTokenAddress", () => {
  // Expected values computed with `findAssociatedTokenPda` from
  // @solana-program/token and @solana-program/token-2022.
  it("derives the ATA for the classic Token program", async () => {
    await expect(getAssociatedTokenAddress(OWNER, EURC)).resolves.toBe(
      "8WfRZkAYCh4sUbD6kF5BheFEUgnmQg5W6X7of86SZ6zd",
    );
  });

  it("derives a different ATA for Token-2022", async () => {
    await expect(
      getAssociatedTokenAddress(OWNER, {
        mint: EURC.mint,
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      }),
    ).resolves.toBe("5JcvQ6qReH81qarAyZXesvoBzqbEMs4ErXaSyVd9e1Be");
  });
});

function tokenAccountData(amount: bigint, size = TOKEN_ACCOUNT_SIZE) {
  const data = new Uint8Array(size);
  data.set(getAddressEncoder().encode(EURC.mint), 0);
  data.set(getAddressEncoder().encode(OWNER), 32);
  data.set(getU64Encoder().encode(amount), 64);
  return data;
}

describe("decodeTokenAccount", () => {
  it("reads mint, owner and amount", () => {
    expect(decodeTokenAccount(tokenAccountData(1_200_000n))).toEqual({
      mint: EURC.mint,
      owner: OWNER,
      amount: 1_200_000n,
    });
  });

  it("reads the full u64 range", () => {
    const max = 2n ** 64n - 1n;
    expect(decodeTokenAccount(tokenAccountData(max)).amount).toBe(max);
  });

  it("accepts Token-2022 accounts with extensions after the base layout", () => {
    expect(decodeTokenAccount(tokenAccountData(5n, 200)).amount).toBe(5n);
  });

  it("rejects data too short to be a token account", () => {
    expect(() => decodeTokenAccount(new Uint8Array(72))).toThrow(RangeError);
  });
});
