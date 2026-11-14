import { signature } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { createReference } from "@repo/payments/reference";

import {
  findSentPayment,
  type SentPayment,
} from "#/features/pay/stores/sent-payments";

const SIGNATURE_A = signature(
  "2eQV3QW28jCTtWUjK8Fvc41Nq2k3i3iR9MXja1fBynPhmLy6qt1LBGAyfgeGtMy1zDEEeXZb2e1T3tswtE648C6v",
);
const SIGNATURE_B = signature(
  "BVyRxLQLRMQuW3rishL3MLF97KVXCkX2ebwZhEunC5o5ZTUHXJamkonoSpdk79Rt7uLkF14VCT3TgUm7ynCaG9g",
);

describe("findSentPayment", () => {
  const reference = createReference();

  it("finds the payment sent for the charge's first reference", () => {
    const payments: SentPayment[] = [
      { reference: createReference(), signature: SIGNATURE_A, confirmed: true },
      { reference, signature: SIGNATURE_B, confirmed: false },
    ];

    expect(
      findSentPayment(payments, { reference: [reference, createReference()] }),
    ).toEqual(payments[1]);
  });

  it("prefers the last payment sent for it", () => {
    const payments: SentPayment[] = [
      { reference, signature: SIGNATURE_A, confirmed: false },
      { reference, signature: SIGNATURE_B, confirmed: true },
    ];

    expect(findSentPayment(payments, { reference: [reference] })).toEqual(
      payments[1],
    );
  });

  it("returns null for another charge or no reference", () => {
    const payments: SentPayment[] = [
      { reference, signature: SIGNATURE_A, confirmed: true },
    ];

    expect(
      findSentPayment(payments, { reference: [createReference()] }),
    ).toBeNull();
    expect(findSentPayment(payments, { reference: [] })).toBeNull();
  });
});
