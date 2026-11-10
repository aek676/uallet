import { address, signature } from "@solana/kit";
import { describe, expect, it, vi } from "vitest";

import {
  type FindSignatures,
  findEarlierPayment,
} from "#/features/pay/utils/earlier-payment";

const REFERENCE = address("dEisjLPK3DQsqcrcgxjuCMzcTTN5Cm7DUzPcBB6SmEK");
const SIG_A = signature(
  "2eQV3QW28jCTtWUjK8Fvc41Nq2k3i3iR9MXja1fBynPhmLy6qt1LBGAyfgeGtMy1zDEEeXZb2e1T3tswtE648C6v",
);
const SIG_B = signature(
  "BVyRxLQLRMQuW3rishL3MLF97KVXCkX2ebwZhEunC5o5ZTUHXJamkonoSpdk79Rt7uLkF14VCT3TgUm7ynCaG9g",
);
const signal = new AbortController().signal;

describe("findEarlierPayment", () => {
  it("finds a successful transaction that mentions the reference", async () => {
    const find = vi.fn<FindSignatures>(() =>
      Promise.resolve([{ signature: SIG_A, err: null }]),
    );

    await expect(
      findEarlierPayment({ reference: [REFERENCE] }, find, signal),
    ).resolves.toBe(SIG_A);
    expect(find).toHaveBeenCalledWith(REFERENCE, signal);
  });

  it("ignores failed transactions", async () => {
    const find = vi.fn<FindSignatures>(() =>
      Promise.resolve([
        { signature: SIG_A, err: { InstructionError: [2, "Custom"] } },
        { signature: SIG_B, err: null },
      ]),
    );

    await expect(
      findEarlierPayment({ reference: [REFERENCE] }, find, signal),
    ).resolves.toBe(SIG_B);
  });

  it("is null when nothing mentions the reference", async () => {
    const find = vi.fn<FindSignatures>(() => Promise.resolve([]));

    await expect(
      findEarlierPayment({ reference: [REFERENCE] }, find, signal),
    ).resolves.toBeNull();
  });

  it("is null without a reference, without asking", async () => {
    const find = vi.fn<FindSignatures>();

    await expect(
      findEarlierPayment({ reference: [] }, find, signal),
    ).resolves.toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("rejects when the request fails", async () => {
    const find = vi.fn<FindSignatures>(() => Promise.reject(new Error("429")));

    await expect(
      findEarlierPayment({ reference: [REFERENCE] }, find, signal),
    ).rejects.toThrow("429");
  });
});
