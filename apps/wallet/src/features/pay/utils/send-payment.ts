import {
  type Address,
  assertIsSendableTransaction,
  type BlockhashLifetimeConstraint,
  getSignatureFromTransaction,
  type SendableTransaction,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { toChargeQuery, type TransferRequest } from "@repo/payments/solana-pay";
import type { PaymentTransaction } from "@repo/payments/transfer";

import { PaymentSendError } from "#/features/pay/utils/payment-failure";
import {
  checkPaymentTransaction,
  type PaymentTransactionResponse,
  signPaymentTransaction,
} from "#/features/pay/utils/payment-transaction";
import type { ApiClient } from "#/lib/api-client";

/** The API didn't give us the transaction: nothing was signed. */
export class PaymentRequestError extends Error {
  readonly status: number;

  constructor(status: number, options?: ErrorOptions) {
    super(`The API couldn't build the payment (${status})`, options);
    this.name = "PaymentRequestError";
    this.status = status;
  }
}

/**
 * Asks the API for the transaction that pays `request` from `account`: the
 * `POST` of the charge's Solana Pay transaction request, made to our own API
 * whatever the link's host (it's always ours: `createPaymentLinkSchema`).
 */
export async function requestPaymentTransaction(
  api: ApiClient,
  request: TransferRequest,
  account: Address,
): Promise<PaymentTransactionResponse> {
  const { data, error } = await api.pay.post(
    { account },
    { query: toChargeQuery(request, PAYMENT_TOKEN.decimals) },
  );
  if (error) {
    throw new PaymentRequestError(error.status, { cause: error.value });
  }
  return data;
}

export interface SendPaymentInput {
  request: TransferRequest;
  signer: TransactionSigner;
  requestTransaction: (
    request: TransferRequest,
  ) => Promise<PaymentTransactionResponse>;
  /** The latest blockhash, from the wallet's own RPC. */
  getLatestBlockhash: () => Promise<BlockhashLifetimeConstraint>;
  /** Sends the signed transaction and resolves once it's `confirmed`. */
  sendAndConfirm: (
    transaction: SendableTransaction & PaymentTransaction,
  ) => Promise<void>;
}

/**
 * Pays `request`: gets the transaction from the API and, at the same time,
 * the latest blockhash; checks it's this payment, signs it with the wallet's
 * blockhash and sends it, waiting for `confirmed`.
 *
 * Only sending throws `PaymentSendError`, with the signature: from then on
 * the payment may have landed. Anything thrown before means nothing was
 * sent.
 */
export async function sendPayment({
  request,
  signer,
  requestTransaction,
  getLatestBlockhash,
  sendAndConfirm,
}: SendPaymentInput): Promise<Signature> {
  const [response, lifetime] = await Promise.all([
    requestTransaction(request),
    getLatestBlockhash(),
  ]);
  const transaction = await checkPaymentTransaction(response, {
    request,
    payer: signer.address,
    lifetime,
  });
  const signed = await signPaymentTransaction(signer, transaction);
  assertIsSendableTransaction(signed);

  const signature = getSignatureFromTransaction(signed);
  try {
    await sendAndConfirm(signed);
  } catch (cause) {
    throw new PaymentSendError(signature, { cause });
  }
  return signature;
}
