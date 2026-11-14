import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";
import {
  encodeTransferRequest,
  type TransferRequest,
} from "@repo/payments/solana-pay";

import {
  checkPaymentLink,
  createPaymentLinkSchema,
  toPaymentLink,
} from "#/features/pay/utils/payment-link";

const PAYER = address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7");
const MERCHANT = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");

const schema = createPaymentLinkSchema(PAYER);

const request: TransferRequest = {
  recipient: MERCHANT,
  amount: 1_200_000n,
  splToken: PAYMENT_TOKEN.mint,
  reference: [createReference()],
  label: "Cafetería Central",
  message: "Café con leche",
};

function link(overrides: Partial<TransferRequest> = {}): string {
  return encodeTransferRequest(
    { ...request, ...overrides },
    PAYMENT_TOKEN.decimals,
  );
}

function messagesOf(input: string): string[] | undefined {
  return schema.safeParse(input).error?.issues.map((issue) => issue.message);
}

describe("createPaymentLinkSchema", () => {
  it("transforms a valid link into its transfer request", () => {
    expect(schema.parse(link())).toEqual(request);
  });

  it("ignores spaces around the link", () => {
    expect(schema.parse(`  ${link()}\n`)).toEqual(request);
  });

  it.each(["", "   "])("asks for the link when it is %j", (input) => {
    expect(messagesOf(input)).toEqual(["Paste the payment link."]);
  });

  it.each([
    ["text", "hola"],
    ["another protocol", "https://example.com"],
    ["an invalid recipient", "solana:abc?amount=1"],
    ["a transaction request", "solana:https://example.com/pay"],
    ["no amount", `solana:${MERCHANT}?spl-token=${PAYMENT_TOKEN.mint}`],
  ])("rejects %s", (_, input) => {
    expect(messagesOf(input)).toEqual(["This link isn't a valid charge."]);
  });

  it("rejects another token", () => {
    expect(messagesOf(link({ splToken: createReference() }))).toEqual([
      `This charge isn't in ${PAYMENT_TOKEN.symbol}.`,
    ]);
  });

  it("rejects a request without reference", () => {
    expect(messagesOf(link({ reference: [] }))).toEqual([
      "This charge has no reference: the merchant couldn't confirm it.",
    ]);
  });

  it("rejects a request with a memo", () => {
    expect(messagesOf(link({ memo: "order-42" }))).toEqual([
      "This charge includes a memo, which Uallet doesn't support.",
    ]);
  });

  it("rejects paying yourself", () => {
    expect(messagesOf(link({ recipient: PAYER }))).toEqual([
      "You can't pay yourself.",
    ]);
  });
});

describe("checkPaymentLink", () => {
  it("returns the transfer request of a valid link", () => {
    expect(checkPaymentLink(link(), PAYER)).toEqual({
      success: true,
      request,
    });
  });

  it.each(["", "   "])("calls a %j link invalid", (input) => {
    expect(checkPaymentLink(input, PAYER)).toEqual({
      success: false,
      message: "This link isn't a valid charge.",
    });
  });

  it("says why the wallet can't pay it", () => {
    expect(checkPaymentLink(link({ recipient: PAYER }), PAYER)).toEqual({
      success: false,
      message: "You can't pay yourself.",
    });
  });
});

describe("toPaymentLink", () => {
  it("encodes the request as its Solana Pay link", () => {
    expect(toPaymentLink(request)).toBe(link());
  });

  it("round-trips through createPaymentLinkSchema", () => {
    const tricky: TransferRequest = {
      ...request,
      reference: [createReference(), createReference()],
      label: "Café & Té? #1",
      message: "Menú del día: 1/2 + bebida, 100% = ok",
    };
    expect(schema.parse(toPaymentLink(tricky))).toEqual(tricky);
  });
});
