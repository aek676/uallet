import {
  type Address,
  address,
  assertIsTransactionWithinSizeLimit,
  blockhash,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  type TransactionModifyingSigner,
  type TransactionPartialSigner,
  type TransactionSigner,
} from "@solana/kit";
import { describe, expect, it, vi } from "vitest";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";
import type { TransferRequest } from "@repo/payments/solana-pay";
import {
  buildPaymentTransaction,
  type PaymentTransaction,
} from "@repo/payments/transfer";

import { PaymentSendError } from "#/features/pay/utils/payment-failure";
import {
  type PaymentTransactionResponse,
  UnexpectedPaymentTransactionError,
} from "#/features/pay/utils/payment-transaction";
import {
  sendPayment,
  type SendPaymentInput,
} from "#/features/pay/utils/send-payment";

type SendAndConfirm = SendPaymentInput["sendAndConfirm"];

const MERCHANT = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");
/** The blockhash of the API's transaction. */
const LIFETIME = {
  blockhash: blockhash("EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N"),
  lastValidBlockHeight: 123_456_789n,
};
/** The latest blockhash, as the wallet reads it. */
const WALLET_LIFETIME = {
  blockhash: blockhash("4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM"),
  lastValidBlockHeight: 123_456_800n,
};

const payer = await generateKeyPairSigner();

const request: TransferRequest = {
  recipient: MERCHANT,
  amount: 1_200_000n,
  splToken: PAYMENT_TOKEN.mint,
  reference: [createReference()],
  label: "Cafetería Central",
};

/** What the API answers: the payment of `charge` by `account`. */
async function apiResponse(
  charge: TransferRequest = request,
  account: Address = payer.address,
): Promise<PaymentTransactionResponse> {
  const transaction = await buildPaymentTransaction({
    request: charge,
    payer: account,
    token: PAYMENT_TOKEN,
    lifetime: LIFETIME,
  });
  return { transaction: getBase64EncodedWireTransaction(transaction) };
}

/** Signs like Web3Auth's wallet, optionally swapping the transaction first. */
function modifyingSigner(
  swap?: (transaction: PaymentTransaction) => Promise<PaymentTransaction>,
): TransactionModifyingSigner {
  return {
    address: payer.address,
    modifyAndSignTransactions: (transactions) =>
      Promise.all(
        transactions.map(async (transaction) => {
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the wallet only gets payment transactions
          const input = transaction as PaymentTransaction;
          const toSign = swap ? await swap(input) : input;
          assertIsTransactionWithinSizeLimit(toSign);
          const [signatures] = await payer.signTransactions([toSign]);
          return {
            ...toSign,
            signatures: { ...toSign.signatures, ...signatures },
          };
        }),
      ),
  };
}

/** The payer, with a spy on its signing (Kit's signers are frozen). */
function spyingSigner() {
  return {
    address: payer.address,
    signTransactions: vi.fn<TransactionPartialSigner["signTransactions"]>(
      (transactions) => payer.signTransactions(transactions),
    ),
  } satisfies TransactionPartialSigner;
}

function pay({
  signer = payer,
  response = apiResponse(),
  lifetime = Promise.resolve(WALLET_LIFETIME),
  sendAndConfirm = vi.fn<SendAndConfirm>(() => Promise.resolve()),
}: {
  signer?: TransactionSigner;
  response?: Promise<PaymentTransactionResponse>;
  lifetime?: Promise<typeof WALLET_LIFETIME>;
  sendAndConfirm?: SendAndConfirm;
} = {}) {
  const requestTransaction = vi.fn<SendPaymentInput["requestTransaction"]>(
    () => response,
  );
  return {
    requestTransaction,
    result: sendPayment({
      request,
      signer,
      requestTransaction,
      getLatestBlockhash: () => lifetime,
      sendAndConfirm,
    }),
  };
}

describe("sendPayment", () => {
  it("signs and sends the API's payment with the wallet's latest blockhash", async () => {
    const sendAndConfirm = vi.fn<SendAndConfirm>(() => Promise.resolve());
    const { requestTransaction, result } = pay({ sendAndConfirm });
    const signature = await result;

    expect(requestTransaction).toHaveBeenCalledWith(request);
    const [sentTransaction] = sendAndConfirm.mock.calls[0] ?? [];
    const expected = await buildPaymentTransaction({
      request,
      payer: payer.address,
      token: PAYMENT_TOKEN,
      lifetime: WALLET_LIFETIME,
    });
    expect(sentTransaction?.messageBytes).toEqual(expected.messageBytes);
    expect(sentTransaction?.lifetimeConstraint).toEqual(WALLET_LIFETIME);
    expect(
      sentTransaction && getSignatureFromTransaction(sentTransaction),
    ).toBe(signature);
  });

  it("works with a wallet that signs through modifyAndSignTransactions", async () => {
    const { result } = pay({ signer: modifyingSigner() });

    await expect(result).resolves.toEqual(expect.any(String));
  });

  it.each([
    ["another amount", apiResponse({ ...request, amount: 120_000_000n })],
    [
      "another recipient",
      apiResponse({ ...request, recipient: createReference() }),
    ],
    [
      "another reference",
      apiResponse({ ...request, reference: [createReference()] }),
    ],
    ["another payer", apiResponse(request, createReference())],
  ])("never signs a transaction for %s", async (_, response) => {
    const signer = spyingSigner();
    const sendAndConfirm = vi.fn<SendAndConfirm>(() => Promise.resolve());
    const { result } = pay({ signer, response, sendAndConfirm });

    await expect(result).rejects.toThrow(UnexpectedPaymentTransactionError);
    expect(signer.signTransactions).not.toHaveBeenCalled();
    expect(sendAndConfirm).not.toHaveBeenCalled();
  });

  it.each([
    ["isn't base64", { transaction: "not a transaction!" }],
    ["isn't a transaction", { transaction: "AAAA" }],
  ])("rejects an answer that %s", async (_, response) => {
    const { result } = pay({ response: Promise.resolve(response) });

    await expect(result).rejects.toThrow(UnexpectedPaymentTransactionError);
  });

  it("never sends a transaction the wallet changed while signing", async () => {
    const sendAndConfirm = vi.fn<SendAndConfirm>(() => Promise.resolve());
    const signer = modifyingSigner(() =>
      buildPaymentTransaction({
        request: { ...request, amount: 120_000_000n },
        payer: payer.address,
        token: PAYMENT_TOKEN,
        lifetime: LIFETIME,
      }),
    );
    const { result } = pay({ signer, sendAndConfirm });

    await expect(result).rejects.toThrow(UnexpectedPaymentTransactionError);
    expect(sendAndConfirm).not.toHaveBeenCalled();
  });

  it("passes on the API's error, before signing anything", async () => {
    const failure = new Error("503");
    const { result } = pay({ response: Promise.reject(failure) });

    await expect(result).rejects.toBe(failure);
  });

  it("signs nothing if it can't read the latest blockhash", async () => {
    const signer = spyingSigner();
    const failure = new Error("fetch failed");
    const { result } = pay({ signer, lifetime: Promise.reject(failure) });

    await expect(result).rejects.toBe(failure);
    expect(signer.signTransactions).not.toHaveBeenCalled();
  });

  it("wraps a failure to send in PaymentSendError, with the signature", async () => {
    const cause = new Error("fetch failed");
    const sendAndConfirm = vi.fn<SendAndConfirm>(() => Promise.reject(cause));
    const { result } = pay({ sendAndConfirm });

    const error = await result.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PaymentSendError);
    const [sentTransaction] = sendAndConfirm.mock.calls[0] ?? [];
    expect(error).toMatchObject({
      cause,
      signature:
        sentTransaction && getSignatureFromTransaction(sentTransaction),
    });
  });
});
