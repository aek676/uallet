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

/** What announced a transaction: the subscription, or looking back. */
export type DetectionVia = "notification" | "look-back";

export interface DetectedPayment {
  signature: Signature;
  /** What announced the transaction first. */
  via: DetectionVia;
  /** `Date.now()` when the transaction was announced. */
  noticedAt: number;
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
  /** How often to ask again for the transactions that mention the reference. */
  lookBackIntervalMs?: number;
}

const RETRY_DELAYS_MS = [250, 500, 1000, 2000] as const;

const LOOK_BACK_INTERVAL_MS = 1000;

/** Failed look-backs in a row before giving up. */
const MAX_FAILED_LOOK_BACKS = 3;

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
 * It listens to the subscription and also keeps looking back: the
 * subscription is the fast path, not a guarantee. RPCs drop notifications
 * (devnet's public endpoint lost 11-20% of them when we measured it), and a
 * dropped one would leave a paid charge waiting forever.
 *
 * Rejects if the subscription breaks, the requests fail or `abortSignal`
 * fires. Calling it again is safe: it finds what landed in the meantime.
 */
export async function waitForPayment(
  source: PaymentSource,
  request: TransferRequest,
  token: Pick<Token, "programAddress">,
  {
    abortSignal,
    onChecking,
    retryDelaysMs = RETRY_DELAYS_MS,
    lookBackIntervalMs = LOOK_BACK_INTERVAL_MS,
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

  async function check(
    { signature, err }: PaymentCandidate,
    via: DetectionVia,
  ): Promise<DetectedPayment | null> {
    // Failed transactions can't pay anything: skip the request.
    if (err !== null || seen.has(signature)) return null;
    seen.add(signature);
    const noticedAt = Date.now();

    checking += 1;
    onChecking?.(true);
    try {
      const transaction = await fetchTransaction(signature);
      return validatePayment(transaction, request, token).valid
        ? { signature, via, noticedAt, detectedAt: Date.now() }
        : null;
    } finally {
      checking -= 1;
      if (checking === 0) onChecking?.(false);
    }
  }

  try {
    const candidates = await source.watch(reference, signal);

    return await new Promise<DetectedPayment>((resolve, reject) => {
      function handle(candidate: PaymentCandidate, via: DetectionVia) {
        check(candidate, via).then((payment) => {
          if (payment) resolve(payment);
        }, reject);
      }

      // Start reading before anything else: Kit drops the notifications
      // that arrive before the first read.
      (async () => {
        for await (const candidate of candidates) {
          handle(candidate, "notification");
        }
        // The iterable ends when aborted, otherwise we stopped hearing.
        throw new Error("The payment subscription ended");
      })().catch(reject);

      // What landed before the subscription was ready, and from then on
      // whatever the subscription didn't announce.
      (async () => {
        let failures = 0;
        while (!signal.aborted) {
          try {
            const earlier = await source.getEarlier(reference, signal);
            failures = 0;
            for (const candidate of earlier) handle(candidate, "look-back");
          } catch (error) {
            // One failed request isn't worth an error on screen while the
            // subscription is alive.
            failures += 1;
            if (failures >= MAX_FAILED_LOOK_BACKS) throw error;
          }
          await delay(lookBackIntervalMs, signal);
        }
      })().catch(reject);
    });
  } catch (error) {
    // Report the caller's abort as such, whatever failed because of it.
    abortSignal.throwIfAborted();
    throw error;
  } finally {
    controller.abort();
  }
}
