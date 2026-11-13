import { createClient, type TransactionSigner } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { signer } from "@solana/kit-plugin-signer";

import { ENV } from "#/config/env";

/**
 * Kit client that can send transactions for `paymentSigner`: it plans them
 * (estimating compute by simulation), asks the signer and sends them through
 * our RPC.
 *
 * `version: 0` because Web3Auth's wallet only signs `legacy` and v0
 * transactions, not v1.
 */
export function createPaymentClient(paymentSigner: TransactionSigner) {
  return createClient()
    .use(signer(paymentSigner))
    .use(
      solanaRpc({
        rpcUrl: ENV.solanaRpcUrl,
        rpcSubscriptionsUrl: ENV.solanaWsUrl,
        transactionConfig: { version: 0 },
      }),
    );
}

export type PaymentClient = ReturnType<typeof createPaymentClient>;
