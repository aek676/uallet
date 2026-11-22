import {
  getSolanaErrorFromJsonRpcError,
  getSolanaErrorFromTransactionError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  signature,
  SolanaError,
} from "@solana/kit";
import { describe, expect, it } from "vitest";

import { PAYMENT_TRANSFER_INDEX } from "@repo/payments/transfer";

import {
  classifyPaymentFailure,
  PaymentSendError,
} from "#/features/pay/utils/payment-failure";
import { UnexpectedPaymentTransactionError } from "#/features/pay/utils/payment-transaction";
import { PaymentRequestError } from "#/features/pay/utils/send-payment";

const SIGNATURE = signature(
  "2eQV3QW28jCTtWUjK8Fvc41Nq2k3i3iR9MXja1fBynPhmLy6qt1LBGAyfgeGtMy1zDEEeXZb2e1T3tswtE648C6v",
);

type TransactionError = Parameters<
  typeof getSolanaErrorFromTransactionError
>[0];

/** What `sendTransaction` throws when the preflight simulation fails. */
function preflightFailure(err: TransactionError): SolanaError {
  return getSolanaErrorFromJsonRpcError({
    code: -32002,
    message: "Transaction simulation failed",
    data: {
      accounts: null,
      err,
      logs: [],
      returnData: null,
      unitsConsumed: 0,
    },
  });
}

function sent(cause: unknown): PaymentSendError {
  return new PaymentSendError(SIGNATURE, { cause });
}

const insufficientFunds = (index: number): TransactionError => ({
  InstructionError: [index, { Custom: 1 }],
});

describe("classifyPaymentFailure", () => {
  it("detects paying more than the balance", () => {
    expect(
      classifyPaymentFailure(
        sent(preflightFailure(insufficientFunds(PAYMENT_TRANSFER_INDEX))),
      ),
    ).toEqual({ kind: "no-funds" });
  });

  it("detects a student without token account", () => {
    expect(
      classifyPaymentFailure(
        sent(
          preflightFailure({
            InstructionError: [PAYMENT_TRANSFER_INDEX, "InvalidAccountData"],
          }),
        ),
      ),
    ).toEqual({ kind: "no-funds" });
  });

  it("reads the same error before the transfer as missing SOL for the rent", () => {
    expect(
      classifyPaymentFailure(sent(preflightFailure(insufficientFunds(0)))),
    ).toEqual({ kind: "no-sol" });
  });

  it.each(["AccountNotFound", "InsufficientFundsForFee"])(
    "detects missing SOL (%s)",
    (err) => {
      expect(classifyPaymentFailure(sent(preflightFailure(err)))).toEqual({
        kind: "no-sol",
      });
    },
  );

  it("says failed when the network rejected the transaction", () => {
    expect(
      classifyPaymentFailure(
        sent(
          preflightFailure({
            InstructionError: [PAYMENT_TRANSFER_INDEX, { Custom: 6000 }],
          }),
        ),
      ),
    ).toEqual({ kind: "failed" });
  });

  it("says failed when it landed and failed", () => {
    expect(
      classifyPaymentFailure(
        sent(getSolanaErrorFromTransactionError("ProgramAccountNotFound")),
      ),
    ).toEqual({ kind: "failed" });
  });

  it("says unknown when a sent transaction loses the connection", () => {
    expect(classifyPaymentFailure(sent(new Error("fetch failed")))).toEqual({
      kind: "unknown",
      signature: SIGNATURE,
    });
  });

  it("says unknown when we stop waiting for a sent transaction", () => {
    expect(
      classifyPaymentFailure(
        sent(
          new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
            currentBlockHeight: 2n,
            lastValidBlockHeight: 1n,
          }),
        ),
      ),
    ).toEqual({ kind: "unknown", signature: SIGNATURE });
  });

  it.each([
    ["the API refused", new PaymentRequestError(503)],
    [
      "the API's transaction wasn't the payment",
      new UnexpectedPaymentTransactionError("not this payment"),
    ],
    ["signing failed", new Error("User rejected")],
    ["something that isn't an error", "boom"],
  ])("says failed when nothing was sent: %s", (_, error) => {
    expect(classifyPaymentFailure(error)).toEqual({ kind: "failed" });
  });
});
