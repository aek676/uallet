import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";
import {
  encodeTransferRequest,
  type TransferRequest,
} from "@repo/payments/solana-pay";

import { createPaymentLinkSchema } from "#/features/pay/utils/payment-link";

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
    expect(messagesOf(input)).toEqual(["Pega el enlace de pago."]);
  });

  it.each([
    ["text", "hola"],
    ["another protocol", "https://example.com"],
    ["an invalid recipient", "solana:abc?amount=1"],
    ["a transaction request", "solana:https://example.com/pay"],
    ["no amount", `solana:${MERCHANT}?spl-token=${PAYMENT_TOKEN.mint}`],
  ])("rejects %s", (_, input) => {
    expect(messagesOf(input)).toEqual(["Este enlace no es un cobro válido."]);
  });

  it("rejects another token", () => {
    expect(messagesOf(link({ splToken: createReference() }))).toEqual([
      `Este cobro no es en ${PAYMENT_TOKEN.symbol}.`,
    ]);
  });

  it("rejects a request without reference", () => {
    expect(messagesOf(link({ reference: [] }))).toEqual([
      "Este cobro no tiene referencia: el comercio no podría confirmarlo.",
    ]);
  });

  it("rejects a request with a memo", () => {
    expect(messagesOf(link({ memo: "order-42" }))).toEqual([
      "Este cobro incluye un memo y Uallet no lo admite.",
    ]);
  });

  it("rejects paying yourself", () => {
    expect(messagesOf(link({ recipient: PAYER }))).toEqual([
      "No puedes pagarte a ti mismo.",
    ]);
  });
});
