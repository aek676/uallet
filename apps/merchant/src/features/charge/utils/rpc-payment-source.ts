import type { PaymentSource } from "#/features/charge/utils/wait-for-payment";
import type { SolanaClient } from "#/lib/solana-client";

/** Irreversible, and since Alpenglow no slower than `confirmed`. */
const COMMITMENT = "finalized";

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
          { commitment: COMMITMENT },
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
