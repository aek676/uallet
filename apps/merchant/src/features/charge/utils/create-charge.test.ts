import { address, isAddress } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { parseTransferRequest } from "@repo/payments/solana-pay";

import type { Merchant } from "#/config/merchant";
import { createCharge } from "#/features/charge/utils/create-charge";

const merchant: Merchant = {
  address: address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99"),
  name: "Cafetería Central",
};

describe("createCharge", () => {
  it("builds a Solana Pay link to the merchant for the payment token", () => {
    const charge = createCharge({
      merchant,
      amount: 1_200_000n,
      concept: "Café con leche",
    });

    expect(isAddress(charge.reference)).toBe(true);
    expect(charge.url).toBe(
      `solana:${merchant.address}?amount=1.2&spl-token=${PAYMENT_TOKEN.mint}` +
        `&reference=${charge.reference}` +
        "&label=Cafeter%C3%ADa%20Central&message=Caf%C3%A9%20con%20leche",
    );
  });

  it("round-trips through the wallet's parser", () => {
    const charge = createCharge({
      merchant,
      amount: 100_000n,
      concept: "Fotocopias",
    });

    expect(parseTransferRequest(charge.url, PAYMENT_TOKEN.decimals)).toEqual(
      charge.request,
    );
    expect(charge.request).toEqual({
      recipient: merchant.address,
      amount: 100_000n,
      splToken: PAYMENT_TOKEN.mint,
      reference: [charge.reference],
      label: merchant.name,
      message: "Fotocopias",
    });
  });

  it.each([undefined, "", "   "])("omits an empty concept (%j)", (concept) => {
    const charge = createCharge({ merchant, amount: 1_000_000n, concept });

    expect(charge.request).not.toHaveProperty("message");
    expect(charge.url).not.toContain("message=");
  });

  it("trims the concept", () => {
    const charge = createCharge({
      merchant,
      amount: 1_000_000n,
      concept: "  Bocadillo  ",
    });

    expect(charge.request.message).toBe("Bocadillo");
  });

  it("uses a new reference for every charge", () => {
    const references = new Set(
      Array.from(
        { length: 50 },
        () => createCharge({ merchant, amount: 1_200_000n }).reference,
      ),
    );

    expect(references.size).toBe(50);
  });

  it("rebuilds the same charge from its reference", () => {
    const charge = createCharge({
      merchant,
      amount: 1_200_000n,
      concept: "Café con leche",
    });

    expect(
      createCharge({
        merchant,
        amount: 1_200_000n,
        concept: "Café con leche",
        reference: charge.reference,
      }),
    ).toEqual(charge);
  });

  it("supports other payment tokens", () => {
    const token = {
      mint: address("11111111111111111111111111111111"),
      decimals: 2,
    };
    const charge = createCharge({ merchant, amount: 120n, token });

    expect(charge.url).toContain(`amount=1.2&spl-token=${token.mint}&`);
    expect(parseTransferRequest(charge.url, token.decimals).amount).toBe(120n);
  });
});
