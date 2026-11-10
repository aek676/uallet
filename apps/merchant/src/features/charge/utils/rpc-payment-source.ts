import type { PaymentSource } from "#/features/charge/utils/wait-for-payment";
import type { SolanaClient } from "#/lib/solana-client";

/**
 * What a payment is read and validated at. Irreversible, and since Alpenglow
 * no slower than `confirmed`.
 */
const COMMITMENT = "finalized";

/**
 * The subscription only announces candidates, and each one is then read at
 * `COMMITMENT`. On devnet's public RPC both levels notify at the same time
 * (1 ms apart), but `finalized` notifications get lost more often: 3 of 19
 * of our payments against 1 of 19, and 11-20% against 2-5% on a busy address.
 */
const ANNOUNCEMENT_COMMITMENT = "confirmed";

/** A reference is unique per charge: it should only ever see one payment. */
const EARLIER_LIMIT = 20;

/** Payment candidates and transactions from the Solana RPC. */
export function createRpcPaymentSource({
  rpc,
  rpcSubscriptions,
}: Pick<SolanaClient, "rpc" | "rpcSubscriptions">): PaymentSource {
  return {
    async watch(reference, abortSignal) {
      const notifications = await rpcSubscriptions
        .logsNotifications(
          { mentions: [reference] },
          { commitment: ANNOUNCEMENT_COMMITMENT },
        )
        .subscribe({ abortSignal });

      return (async function* candidates() {
        for await (const { value } of notifications) yield value;
      })();
    },

    getEarlier(reference, abortSignal) {
      return rpc
        .getSignaturesForAddress(reference, {
          commitment: COMMITMENT,
          limit: EARLIER_LIMIT,
        })
        .send({ abortSignal });
    },

    getTransaction(signature, abortSignal) {
      return rpc
        .getTransaction(signature, {
          commitment: COMMITMENT,
          encoding: "json",
          // Our wallet sends v0, but read v1 too: without this the RPC
          // answers with an error for newer transactions.
          maxSupportedTransactionVersion: 1,
        })
        .send({ abortSignal });
    },
  };
}
