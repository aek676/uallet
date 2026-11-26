import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { PAYMENT_TOKEN } from "./config";
import { createReference } from "./reference";
import {
  encodeTransactionRequest,
  findTransferRequestProblem,
  parseChargeQuery,
  parseTransactionRequest,
  toChargeQuery,
  type TransferRequest,
  TransferRequestError,
  type TransferRequestProblem,
} from "./solana-pay";

const ENDPOINT = "https://api.example.com/pay";
const RECIPIENT = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");
const PAYER = address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7");
const REFERENCE = address("11111111111111111111111111111111");
const MINT = PAYMENT_TOKEN.mint;
const DECIMALS = PAYMENT_TOKEN.decimals;

const request: TransferRequest = {
  recipient: RECIPIENT,
  amount: 1_200_000n,
  splToken: MINT,
  reference: [REFERENCE],
  label: "Cafetería Central",
  message: "Café con leche",
};

/** A `solana:` link to `url`, encoded as the spec requires. */
function linkTo(url: string): string {
  return `solana:${encodeURIComponent(url)}`;
}

function parse(link: string): TransferRequest {
  return parseTransactionRequest(link, ENDPOINT, DECIMALS);
}

function query(params: string): URLSearchParams {
  return new URLSearchParams(params);
}

describe("encodeTransactionRequest", () => {
  it("builds a transaction request to the endpoint with the charge in its query", () => {
    expect(encodeTransactionRequest(ENDPOINT, request, DECIMALS)).toBe(
      linkTo(
        `${ENDPOINT}?recipient=${RECIPIENT}&amount=1.2&spl-token=${MINT}` +
          `&reference=${REFERENCE}` +
          "&label=Cafeter%C3%ADa%20Central&message=Caf%C3%A9%20con%20leche",
      ),
    );
  });

  it("encodes the whole link, so nothing in it reads as a protocol parameter", () => {
    const link = encodeTransactionRequest(ENDPOINT, request, DECIMALS);
    expect(link).toMatch(/^solana:https%3A%2F%2Fapi\.example\.com%2Fpay%3F/);
    expect(link).not.toMatch(/[?&=]/);
  });

  it("omits optional parameters", () => {
    expect(
      encodeTransactionRequest(
        ENDPOINT,
        {
          recipient: RECIPIENT,
          amount: 100_000n,
          splToken: MINT,
          reference: [],
        },
        DECIMALS,
      ),
    ).toBe(
      linkTo(`${ENDPOINT}?recipient=${RECIPIENT}&amount=0.1&spl-token=${MINT}`),
    );
  });

  it("keeps reserved characters in the texts", () => {
    const message = "2 cafés & 1 té = 3,50 €? #1 100%";
    const link = encodeTransactionRequest(
      ENDPOINT,
      { ...request, message },
      DECIMALS,
    );
    expect(parse(link).message).toBe(message);
  });

  it.each([0n, -1n])("rejects an amount of %s", (amount) => {
    expect(() =>
      encodeTransactionRequest(ENDPOINT, { ...request, amount }, DECIMALS),
    ).toThrow(TransferRequestError);
  });

  it.each([`${ENDPOINT}?a=1`, `${ENDPOINT}#a`])(
    "rejects an endpoint with a query or a hash (%s)",
    (endpoint) => {
      expect(() =>
        encodeTransactionRequest(endpoint, request, DECIMALS),
      ).toThrow(TypeError);
    },
  );
});

describe("parseTransactionRequest", () => {
  it("round-trips every field", () => {
    expect(
      parse(encodeTransactionRequest(ENDPOINT, request, DECIMALS)),
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
      parse(encodeTransactionRequest(ENDPOINT, minimal, DECIMALS)),
    ).toEqual(minimal);
  });

  it("keeps several references in order", () => {
    const reference = [createReference(), createReference(), createReference()];
    const link = encodeTransactionRequest(
      ENDPOINT,
      { ...request, reference },
      DECIMALS,
    );
    expect(parse(link).reference).toEqual(reference);
  });

  it("compares the endpoint as a URL, e.g. with its default port written out", () => {
    const link = linkTo(
      `https://api.example.com:443/pay?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}`,
    );
    expect(parse(link).amount).toBe(1_000_000n);
  });

  it("accepts `+` as a space from other encoders", () => {
    const link = linkTo(
      `${ENDPOINT}?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}&label=Cafeter%C3%ADa+Central`,
    );
    expect(parse(link).label).toBe("Cafetería Central");
  });

  it("ignores unknown parameters", () => {
    const link = linkTo(
      `${ENDPOINT}?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}&foo=bar`,
    );
    expect(parse(link)).toEqual({
      recipient: RECIPIENT,
      amount: 1_000_000n,
      splToken: MINT,
      reference: [],
    });
  });

  it.each([
    ["not a URL", "1.2 EURC"],
    ["another protocol", `https://example.com/${RECIPIENT}`],
    [
      "a transfer request",
      `solana:${RECIPIENT}?amount=1&spl-token=${MINT}&reference=${REFERENCE}`,
    ],
    [
      "a request to another endpoint",
      linkTo(
        `https://evil.example.com/pay?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}`,
      ),
    ],
    [
      "a request to another path",
      linkTo(
        `https://api.example.com/other?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}`,
      ),
    ],
    [
      "a request over HTTP",
      linkTo(
        `http://api.example.com/pay?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}`,
      ),
    ],
    [
      "a request over HTTP to localhost, if the endpoint is HTTPS",
      linkTo(
        `http://localhost/pay?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}`,
      ),
    ],
    [
      "an unencoded link, whose query isn't the endpoint's",
      `solana:${ENDPOINT}?recipient=${RECIPIENT}&amount=1&spl-token=${MINT}`,
    ],
    [
      "a badly encoded link",
      "solana:https%3A%2F%2Fapi.example.com%2Fpay%E0%A4%A",
    ],
  ])("rejects %s", (_, link) => {
    expect(() => parse(link)).toThrow(TransferRequestError);
  });
});

describe("parseChargeQuery", () => {
  it("reads the charge of a query", () => {
    expect(
      parseChargeQuery(
        query(
          `recipient=${RECIPIENT}&amount=1.2&spl-token=${MINT}&reference=${REFERENCE}&label=Bar`,
        ),
        DECIMALS,
      ),
    ).toEqual({
      recipient: RECIPIENT,
      amount: 1_200_000n,
      splToken: MINT,
      reference: [REFERENCE],
      label: "Bar",
    });
  });

  it.each([
    ["a missing recipient", `amount=1&spl-token=${MINT}`],
    ["an invalid recipient", `recipient=abc&amount=1&spl-token=${MINT}`],
    ["a missing amount", `recipient=${RECIPIENT}&spl-token=${MINT}`],
    [
      "an invalid amount",
      `recipient=${RECIPIENT}&amount=1,20&spl-token=${MINT}`,
    ],
    [
      "too many decimals",
      `recipient=${RECIPIENT}&amount=1.2345678&spl-token=${MINT}`,
    ],
    ["a zero amount", `recipient=${RECIPIENT}&amount=0&spl-token=${MINT}`],
    ["a missing spl-token", `recipient=${RECIPIENT}&amount=1`],
    ["an invalid spl-token", `recipient=${RECIPIENT}&amount=1&spl-token=EURC`],
    [
      "an invalid reference",
      `recipient=${RECIPIENT}&amount=1&spl-token=${MINT}&reference=abc`,
    ],
    [
      "a duplicate amount",
      `recipient=${RECIPIENT}&amount=1&amount=100&spl-token=${MINT}`,
    ],
    [
      "a duplicate recipient",
      `recipient=${RECIPIENT}&recipient=${PAYER}&amount=1&spl-token=${MINT}`,
    ],
  ])("rejects %s", (_, params) => {
    expect(() => parseChargeQuery(query(params), DECIMALS)).toThrow(
      TransferRequestError,
    );
  });

  it("keeps the underlying error as the cause", () => {
    let error: unknown;
    try {
      parseChargeQuery(
        query(`recipient=${RECIPIENT}&amount=1.2345678&spl-token=${MINT}`),
        DECIMALS,
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(TransferRequestError);
    expect(error instanceof Error && error.cause).toBeInstanceOf(RangeError);
  });
});

describe("toChargeQuery", () => {
  it("is the query parseChargeQuery reads back", () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(
      toChargeQuery(request, DECIMALS),
    )) {
      const items = typeof value === "string" ? [value] : value;
      for (const item of items) params.append(key, item);
    }
    expect(parseChargeQuery(params, DECIMALS)).toEqual(request);
  });
});

describe("findTransferRequestProblem", () => {
  const check = (overrides: Partial<TransferRequest>) =>
    findTransferRequestProblem(
      { ...request, ...overrides },
      { payer: PAYER, token: PAYMENT_TOKEN },
    );

  it("finds nothing wrong with a payable charge", () => {
    expect(check({})).toBeNull();
  });

  it.each<[TransferRequestProblem, Partial<TransferRequest>]>([
    ["wrong-token", { splToken: createReference() }],
    ["no-reference", { reference: [] }],
    ["self-payment", { recipient: PAYER }],
  ])("finds %s", (problem, overrides) => {
    expect(check(overrides)).toBe(problem);
  });
});
