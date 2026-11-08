import {
  failedSingleTransactionPlanResult,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__FAILED_TO_SEND_TRANSACTION,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SOLANA_ERROR__INSTRUCTION_ERROR__INVALID_ACCOUNT_DATA,
  SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  type Signature,
  signature,
  SolanaError,
} from "@solana/kit";
import { describe, expect, it } from "vitest";

import { classifyPaymentFailure } from "#/features/pay/utils/payment-failure";

const SIGNATURE = signature(
  "2eQV3QW28jCTtWUjK8Fvc41Nq2k3i3iR9MXja1fBynPhmLy6qt1LBGAyfgeGtMy1zDEEeXZb2e1T3tswtE648C6v",
);

/** Compute budget, create the merchant's account and transfer, as in a payment. */
const message = { instructions: [{}, {}, {}] };
const TRANSFER_INDEX = 2;

function sendError(
  cause: Error,
  context: { signature?: Signature } = {},
): SolanaError {
  const error = new SolanaError(SOLANA_ERROR__FAILED_TO_SEND_TRANSACTION, {
    cause,
    causeMessage: cause.message,
    transactionPlanResult: failedSingleTransactionPlanResult(
      // @ts-expect-error -- only `instructions` matters here.
      message,
      cause,
      { message, ...context },
    ),
  });
  return error;
}

function customError(code: number, index: number): SolanaError {
  return new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM, {
    code,
    index,
  });
}

describe("classifyPaymentFailure", () => {
  it("detects paying more than the balance", () => {
    expect(
      classifyPaymentFailure(sendError(customError(1, TRANSFER_INDEX))),
    ).toEqual({ kind: "no-funds" });
  });

  it("detects a student without token account", () => {
    expect(
      classifyPaymentFailure(
        sendError(
          new SolanaError(
            SOLANA_ERROR__INSTRUCTION_ERROR__INVALID_ACCOUNT_DATA,
            { index: TRANSFER_INDEX },
          ),
        ),
      ),
    ).toEqual({ kind: "no-funds" });
  });

  it("reads the same error before the transfer as missing SOL for the rent", () => {
    expect(classifyPaymentFailure(sendError(customError(1, 1)))).toEqual({
      kind: "no-sol",
    });
  });

  it.each([
    SOLANA_ERROR__TRANSACTION_ERROR__ACCOUNT_NOT_FOUND,
    SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  ] as const)("detects missing SOL (%s)", (code) => {
    expect(classifyPaymentFailure(sendError(new SolanaError(code)))).toEqual({
      kind: "no-sol",
    });
  });

  it("says failed when it never got signed", () => {
    expect(
      classifyPaymentFailure(sendError(new Error("fetch failed"))),
    ).toEqual({ kind: "failed" });
  });

  it("says failed when the network rejected the signed transaction", () => {
    expect(
      classifyPaymentFailure(
        sendError(customError(6000, TRANSFER_INDEX), { signature: SIGNATURE }),
      ),
    ).toEqual({ kind: "failed" });
  });

  it("says unknown when a signed transaction loses the connection", () => {
    expect(
      classifyPaymentFailure(
        sendError(new Error("fetch failed"), { signature: SIGNATURE }),
      ),
    ).toEqual({ kind: "unknown", signature: SIGNATURE });
  });

  it("says unknown when we stop waiting for a signed transaction", () => {
    expect(
      classifyPaymentFailure(
        sendError(
          new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
            currentBlockHeight: 2n,
            lastValidBlockHeight: 1n,
          }),
          { signature: SIGNATURE },
        ),
      ),
    ).toEqual({ kind: "unknown", signature: SIGNATURE });
  });

  it("says failed for errors that aren't from sending", () => {
    expect(classifyPaymentFailure(new Error("boom"))).toEqual({
      kind: "failed",
    });
    expect(classifyPaymentFailure("boom")).toEqual({ kind: "failed" });
  });
});
