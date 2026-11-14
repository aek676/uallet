import { address } from "@solana/kit";
import {
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import type { Merchant } from "#/config/merchant";
import {
  toChargeDetails,
  toChargeSearch,
  validateChargeSearch,
} from "#/features/charge/utils/charge-search";
import { MAX_CONCEPT_LENGTH } from "#/features/charge/utils/concept";
import { createCharge } from "#/features/charge/utils/create-charge";

const merchant: Merchant = {
  address: address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99"),
  name: "Cafetería Central",
};

const INVALID = { amount: undefined, concept: undefined };

/** What the route sees after the charge goes through the URL. */
function throughUrl(search: object) {
  return validateChargeSearch(
    defaultParseSearch(defaultStringifySearch(search)),
  );
}

function rebuild(search: ReturnType<typeof validateChargeSearch>) {
  if (search.amount === undefined) throw new Error("Invalid charge search");
  return toChargeDetails(search);
}

describe("charge search", () => {
  it("keeps the amount in base units, as a JSON number", () => {
    const charge = createCharge({ merchant, amount: 1_200_000n });

    expect(defaultStringifySearch(toChargeSearch(charge))).toBe(
      "?amount=1200000",
    );
  });

  it.each([
    [1_200_000n, "Café con leche"],
    [10_000n, undefined],
    [100_000_000n, "a".repeat(MAX_CONCEPT_LENGTH)],
    // Strings that look like JSON must come back as strings.
    [1_000_000n, "123"],
    [1_000_000n, "true"],
    [1_000_000n, '{"a":1}'],
  ])("rebuilds a charge of %s with concept %j", (amount, concept) => {
    const charge = createCharge({ merchant, amount, concept });
    const search = throughUrl(toChargeSearch(charge));

    expect(
      createCharge({
        merchant,
        reference: charge.reference,
        ...rebuild(search),
      }),
    ).toEqual(charge);
  });

  it("leaves an empty concept out of the URL", () => {
    const charge = createCharge({ merchant, amount: 1_000_000n, concept: " " });

    expect(toChargeSearch(charge)).toEqual({ amount: 1_000_000 });
  });

  it("trims the concept", () => {
    expect(validateChargeSearch({ amount: 1, concept: "  Café  " })).toEqual({
      amount: 1,
      concept: "Café",
    });
  });

  it("ignores other params", () => {
    expect(validateChargeSearch({ amount: 1, recipient: "x" })).toEqual({
      amount: 1,
    });
  });

  it.each([
    ["no amount", {}],
    ["a non-integer amount", { amount: 1.5 }],
    ["a zero amount", { amount: 0 }],
    ["a negative amount", { amount: -1_000_000 }],
    ["an amount above the maximum", { amount: 100_000_001 }],
    ["an amount as a string", { amount: "1200000" }],
    ["an amount in euros", { amount: "1,20" }],
    ["a non-finite amount", { amount: Number.POSITIVE_INFINITY }],
    [
      "a concept that's too long",
      { amount: 1, concept: "a".repeat(MAX_CONCEPT_LENGTH + 1) },
    ],
    ["a concept that isn't text", { amount: 1, concept: 123 }],
  ])("rejects %s", (_, search) => {
    expect(validateChargeSearch(search)).toEqual(INVALID);
  });

  it.each([
    "?amount=abc",
    "?amount=1.5",
    "?amount=0",
    "?amount=100000001",
    "?amount=1200000&amount=1",
    "?concept=Caf%C3%A9",
  ])("rejects the URL %s", (url) => {
    expect(validateChargeSearch(defaultParseSearch(url))).toEqual(INVALID);
  });
});
