import { address } from "@solana/kit";
import {
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";

import { paySearchSchema } from "#/features/pay/utils/pay-search";
import { toPaymentLink } from "#/features/pay/utils/payment-link";

const MERCHANT = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");

const link = toPaymentLink({
  recipient: MERCHANT,
  amount: 1_200_000n,
  splToken: PAYMENT_TOKEN.mint,
  reference: [createReference()],
  label: "Café & Té? #1",
  message: "Menú del día",
});

/** What `/pay` reads back from a URL the router built. */
function throughUrl(search: Record<string, unknown>) {
  return paySearchSchema.parse(
    defaultParseSearch(defaultStringifySearch(search)),
  );
}

describe("paySearchSchema", () => {
  it("gets back the link from the URL as is", () => {
    expect(throughUrl({ link })).toEqual({ link });
  });

  it("keeps the link a single search param", () => {
    const params = new URLSearchParams(defaultStringifySearch({ link }));
    expect([...params.keys()]).toEqual(["link"]);
    expect(params.get("link")).toBe(link);
  });

  it.each([
    ["missing", {}],
    ["a number", { link: 42 }],
    ["an object", { link: { a: 1 } }],
  ])("turns a %s link into an empty one", (_, search) => {
    expect(throughUrl(search)).toEqual({ link: "" });
  });
});
