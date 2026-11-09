import { type Address, getAbortablePromise, type Signature } from "@solana/kit";

import type { Token } from "@repo/payments/config";
import type { TransferRequest } from "@repo/payments/solana-pay";
import {
  type PaymentTransaction,
  validatePayment,
} from "@repo/payments/validate-payment";

/** A transaction that mentions the charge's reference. `err`: it failed. */
export interface PaymentCandidate {
  signature: Signature;
  err: unknown;
}

/** Where candidates and transactions come from: the RPC, or a fake in tests. */
export interface PaymentSource {
  /**
   * Resolves once subscribed, with the finalized transactions that mention
   * `reference` from then on. Throws if the connection drops.
   */
  watch(
    reference: Address,
    abortSignal: AbortSignal,
  ): Promise<AsyncIterable<PaymentCandidate>>;
  /** Finalized transactions that already mention `reference`. */
  getEarlier(
    reference: Address,
    abortSignal: AbortSignal,
  ): Promise<readonly PaymentCandidate[]>;
  /** `null` while the RPC doesn't have the transaction yet. */
  getTransaction(
    signature: Signature,
    abortSignal: AbortSignal,
  ): Promise<PaymentTransaction | null>;
}

export interface DetectedPayment {
  signature: Signature;
  /** `Date.now()` when the payment was validated. */
  detectedAt: number;
}

export interface WaitForPaymentOptions {
  abortSignal: AbortSignal;
  /** `true` while some candidate is being fetched and validated. */
  onChecking?: (checking: boolean) => void;
  /**
   * Waits before each retry while the RPC doesn't have a transaction it just
   * announced. After the last one, waiting fails.
   */
  retryDelaysMs?: readonly number[];
}

const RETRY_DELAYS_MS = [250, 500, 1000, 2000] as const;

function delay(ms: number, abortSignal: AbortSignal): Promise<void> {
  return getAbortablePromise(
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }),
    abortSignal,
  );
}

/**
 * Resolves with the first transaction that pays `request`: it succeeded,
 * mentions the reference and the merchant received exactly the amount
 * (`validatePayment`). Anything else that mentions the reference is ignored
 * and it keeps waiting.
 *
 * Rejects if the connection drops, a request fails or `abortSignal` fires.
 * Calling it again is safe: it also looks at what landed before subscribing.
 */
export async function waitForPayment(
  source: PaymentSource,
  request: TransferRequest,
  token: Pick<Token, "programAddress">,
  {
    abortSignal,
    onChecking,
    retryDelaysMs = RETRY_DELAYS_MS,
  }: WaitForPaymentOptions,
): Promise<DetectedPayment> {
  // The subscription takes one address. The wallet includes every reference
  // and `validatePayment` requires them all.
  const [reference] = request.reference;
  if (reference === undefined) {
    throw new Error("The charge has no reference to watch");
  }

  // Ours, to close the subscription and pending requests once we're done.
  const controller = new AbortController();
  const signal = AbortSignal.any([abortSignal, controller.signal]);

  const seen = new Set<Signature>();
  let checking = 0;

  async function fetchTransaction(
    signature: Signature,
  ): Promise<PaymentTransaction> {
    for (const wait of [0, ...retryDelaysMs]) {
      if (wait > 0) await delay(wait, signal);
      const transaction = await source.getTransaction(signature, signal);
      if (transaction) return transaction;
    }
    throw new Error(`Transaction ${signature} is not available`);
  }

  async function check({
    signature,
    err,
  }: PaymentCandidate): Promise<DetectedPayment | null> {
    // Failed transactions can't pay anything: skip the request.
    if (err !== null || seen.has(signature)) return null;
    seen.add(signature);

    checking += 1;
    onChecking?.(true);
    try {
      const transaction = await fetchTransaction(signature);
      return validatePayment(transaction, request, token).valid
        ? { signature, detectedAt: Date.now() }
        : null;
    } finally {
      checking -= 1;
      if (checking === 0) onChecking?.(false);
    }
  }

  try {
    const candidates = await source.watch(reference, signal);

    return await new Promise<DetectedPayment>((resolve, reject) => {
      function handle(candidate: PaymentCandidate) {
        check(candidate).then((payment) => {
          if (payment) resolve(payment);
        }, reject);
      }

      // Start reading before anything else: Kit drops the notifications
      // that arrive before the first read.
      (async () => {
        for await (const candidate of candidates) handle(candidate);
        // The iterable ends when aborted, otherwise we stopped hearing.
        throw new Error("The payment subscription ended");
      })().catch(reject);

      // What landed before the subscription was ready.
      source
        .getEarlier(reference, signal)
        .then((earlier) => {
          for (const candidate of earlier) handle(candidate);
        })
        .catch(reject);
    });
  } catch (error) {
    // Report the caller's abort as such, whatever failed because of it.
    abortSignal.throwIfAborted();
    throw error;
  } finally {
    controller.abort();
  }
}
