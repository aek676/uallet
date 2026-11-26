import {
  type Address,
  assertIsTransactionWithinSizeLimit,
  blockhash,
  type BlockhashLifetimeConstraint,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  isTransactionModifyingSigner,
  isTransactionPartialSigner,
  type ReadonlyUint8Array,
  type TransactionSigner,
} from "@solana/kit";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import type { TransferRequest } from "@repo/payments/solana-pay";
import {
  buildPaymentTransaction,
  type PaymentTransaction,
} from "@repo/payments/transfer";

/** The API's answer to `POST /pay`. */
export interface PaymentTransactionResponse {
  transaction: string;
}

/** A transaction that isn't the payment the student confirmed: never signed. */
export class UnexpectedPaymentTransactionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UnexpectedPaymentTransactionError";
  }
}

function bytesEqual(a: ReadonlyUint8Array, b: ReadonlyUint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function decode(response: PaymentTransactionResponse) {
  try {
    const transaction = getTransactionDecoder().decode(
      getBase64Encoder().encode(response.transaction),
    );
    const { lifetimeToken } = getCompiledTransactionMessageDecoder().decode(
      transaction.messageBytes,
    );
    return { transaction, blockhash: blockhash(lifetimeToken) };
  } catch (cause) {
    throw new UnexpectedPaymentTransactionError(
      "Can't read the API's transaction",
      { cause },
    );
  }
}

/**
 * The payment to sign, once the API's transaction is checked to be exactly
 * `payer` paying `request`: the wallet builds the same payment with the API's
 * blockhash and compares the bytes. Web3Auth signs without asking, so this is
 * the check of what gets signed. Anything else throws
 * `UnexpectedPaymentTransactionError`.
 *
 * It returns the wallet's own copy, built with `lifetime`, the latest
 * blockhash the wallet read itself: the API's transaction comes unsigned, and
 * the Solana Pay spec then has the wallet ignore its blockhash and set the
 * latest one ("Empty Signatures"). Its only signer is the payer, so nobody
 * else signs, now or later.
 */
export async function checkPaymentTransaction(
  response: PaymentTransactionResponse,
  {
    request,
    payer,
    lifetime,
  }: {
    request: TransferRequest;
    payer: Address;
    lifetime: BlockhashLifetimeConstraint;
  },
): Promise<PaymentTransaction> {
  const api = decode(response);
  const expected = await buildPaymentTransaction({
    request,
    payer,
    token: PAYMENT_TOKEN,
    // Only the blockhash reaches the message bytes, not the block height.
    lifetime: { ...lifetime, blockhash: api.blockhash },
  });
  if (!bytesEqual(api.transaction.messageBytes, expected.messageBytes)) {
    throw new UnexpectedPaymentTransactionError(
      "The API's transaction isn't the payment of this charge",
    );
  }
  return buildPaymentTransaction({
    request,
    payer,
    token: PAYMENT_TOKEN,
    lifetime,
  });
}

/**
 * `transaction` signed by `signer`, as is: a wallet that changes what it
 * signs (`modifyAndSignTransactions`) is rejected, since the student
 * confirmed this payment and no other.
 */
export async function signPaymentTransaction(
  signer: TransactionSigner,
  transaction: PaymentTransaction,
): Promise<PaymentTransaction> {
  assertIsTransactionWithinSizeLimit(transaction);
  if (isTransactionModifyingSigner(signer)) {
    const [signed] = await signer.modifyAndSignTransactions([transaction]);
    if (
      signed === undefined ||
      !bytesEqual(signed.messageBytes, transaction.messageBytes)
    ) {
      throw new UnexpectedPaymentTransactionError(
        "The wallet changed the transaction while signing it",
      );
    }
    return Object.freeze({
      ...transaction,
      signatures: Object.freeze({
        ...transaction.signatures,
        ...signed.signatures,
      }),
    });
  }
  if (isTransactionPartialSigner(signer)) {
    const [signatures] = await signer.signTransactions([transaction]);
    return Object.freeze({
      ...transaction,
      signatures: Object.freeze({ ...transaction.signatures, ...signatures }),
    });
  }
  throw new TypeError(
    "This wallet can't sign a transaction without sending it",
  );
}
