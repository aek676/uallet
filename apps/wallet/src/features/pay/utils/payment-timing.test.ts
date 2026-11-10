import { signature } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { toPaymentTiming } from "#/features/pay/utils/payment-timing";
import { totalMs } from "#/stores/payment-timings";

const SIGNATURE = signature(
  "2eQV3QW28jCTtWUjK8Fvc41Nq2k3i3iR9MXja1fBynPhmLy6qt1LBGAyfgeGtMy1zDEEeXZb2e1T3tswtE648C6v",
);

describe("toPaymentTiming", () => {
  it("splits a payment into its stages", () => {
    const timing = toPaymentTiming(
      SIGNATURE,
      { startedAt: 10_000, signStartedAt: 10_154, signedAt: 10_172 },
      10_886,
    );

    expect(timing).toEqual({
      signature: SIGNATURE,
      startedAt: 10_000,
      prepareMs: 154,
      signMs: 18,
      confirmMs: 714,
    });
    expect(timing && totalMs(timing)).toBe(886);
  });

  it.each([
    [{ startedAt: 10_000 }],
    [{ startedAt: 10_000, signStartedAt: 10_154 }],
  ])("is null when signing wasn't timed (%j)", (marks) => {
    expect(toPaymentTiming(SIGNATURE, marks, 10_886)).toBeNull();
  });

  it("never reports a negative stage if the clock steps back", () => {
    expect(
      toPaymentTiming(
        SIGNATURE,
        { startedAt: 10_000, signStartedAt: 9_990, signedAt: 10_010 },
        10_005,
      ),
    ).toMatchObject({ prepareMs: 0, signMs: 20, confirmMs: 0 });
  });
});
