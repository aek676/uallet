import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { EURC } from "./config";
import { createReference } from "./reference";
import {
  encodeTransferRequest,
  parseTransferRequest,
  type TransferRequest,
  TransferRequestError,
} from "./solana-pay";

const RECIPIENT = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");
const REFERENCE = address("11111111111111111111111111111111");
const MINT = EURC.mint;
const DECIMALS = EURC.decimals;

const request: TransferRequest = {
  recipient: RECIPIENT,
  amount: 1_200_000n,
  splToken: MINT,
  reference: [REFERENCE],
  label: "Cafetería Central",
  message: "Café con leche",
  memo: "order-42",
};

describe("encodeTransferRequest", () => {
  it("builds a Solana Pay link", () => {
    expect(encodeTransferRequest(request, DECIMALS)).toBe(
      `solana:${RECIPIENT}?amount=1.2&spl-token=${MINT}&reference=${REFERENCE}` +
        "&label=Cafeter%C3%ADa%20Central&message=Caf%C3%A9%20con%20leche" +
        "&memo=order-42",
    );
  });

  it("omits optional parameters", () => {
    expect(
      encodeTransferRequest(
        {
          recipient: RECIPIENT,
          amount: 100_000n,
          splToken: MINT,
          reference: [],
        },
        DECIMALS,
      ),
    ).toBe(`solana:${RECIPIENT}?amount=0.1&spl-token=${MINT}`);
  });

  it("encodes reserved characters", () => {
    const link = encodeTransferRequest(
      { ...request, message: "2 cafés & 1 té = 3,50 €?" },
      DECIMALS,
    );
    expect(link).toContain(
      "message=2%20caf%C3%A9s%20%26%201%20t%C3%A9%20%3D%203%2C50%20%E2%82%AC%3F",
    );
    expect(parseTransferRequest(link, DECIMALS).message).toBe(
      "2 cafés & 1 té = 3,50 €?",
    );
  });

  it.each([0n, -1n])("rejects an amount of %s", (amount) => {
    expect(() =>
      encodeTransferRequest({ ...request, amount }, DECIMALS),
    ).toThrow(TransferRequestError);
  });
});

describe("parseTransferRequest", () => {
  it("round-trips every field", () => {
    expect(
      parseTransferRequest(encodeTransferRequest(request, DECIMALS), DECIMALS),
    ).toEqual(request);
  });

  it("round-trips a request without optional fields", () => {
    const minimal: TransferRequest = {
      recipient: RECIPIENT,
      amount: 1n,
      splToken: MINT,
      reference: [],
    };
    expect(
      parseTransferRequest(encodeTransferRequest(minimal, DECIMALS), DECIMALS),
    ).toEqual(minimal);
  });

  it("keeps several references in order", () => {
    const reference = [createReference(), createReference(), createReference()];
    const link = encodeTransferRequest({ ...request, reference }, DECIMALS);
    expect(parseTransferRequest(link, DECIMALS).reference).toEqual(reference);
  });

  it("accepts `+` as a space from other encoders", () => {
    const link = `solana:${RECIPIENT}?amount=1&spl-token=${MINT}&label=Cafeter%C3%ADa+Central`;
    expect(parseTransferRequest(link, DECIMALS).label).toBe(
      "Cafetería Central",
    );
  });

  it("ignores unknown parameters", () => {
    const link = `solana:${RECIPIENT}?amount=1&spl-token=${MINT}&foo=bar`;
    expect(parseTransferRequest(link, DECIMALS)).toEqual({
      recipient: RECIPIENT,
      amount: 1_000_000n,
      splToken: MINT,
      reference: [],
    });
  });

  it.each([
    ["not a URL", "1.2 EURC"],
    ["another protocol", `https://example.com/${RECIPIENT}`],
    ["a transaction request", "solana:https://example.com/pay"],
    [
      "an encoded transaction request",
      "solana:https%3A%2F%2Fexample.com%2Fpay",
    ],
    [
      "an invalid recipient",
      `solana:not-an-address?amount=1&spl-token=${MINT}`,
    ],
    ["a missing amount", `solana:${RECIPIENT}?spl-token=${MINT}`],
    ["an invalid amount", `solana:${RECIPIENT}?amount=1,20&spl-token=${MINT}`],
    [
      "too many decimals",
      `solana:${RECIPIENT}?amount=1.2345678&spl-token=${MINT}`,
    ],
    ["a zero amount", `solana:${RECIPIENT}?amount=0&spl-token=${MINT}`],
    ["a missing spl-token", `solana:${RECIPIENT}?amount=1`],
    ["an invalid spl-token", `solana:${RECIPIENT}?amount=1&spl-token=EURC`],
    [
      "an invalid reference",
      `solana:${RECIPIENT}?amount=1&spl-token=${MINT}&reference=abc`,
    ],
    [
      "a duplicate amount",
      `solana:${RECIPIENT}?amount=1&amount=100&spl-token=${MINT}`,
    ],
  ])("rejects %s", (_, link) => {
    expect(() => parseTransferRequest(link, DECIMALS)).toThrow(
      TransferRequestError,
    );
  });

  it("keeps the underlying error as the cause", () => {
    const link = `solana:${RECIPIENT}?amount=1.2345678&spl-token=${MINT}`;
    let error: unknown;
    try {
      parseTransferRequest(link, DECIMALS);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(TransferRequestError);
    expect(error instanceof Error && error.cause).toBeInstanceOf(RangeError);
  });
});
