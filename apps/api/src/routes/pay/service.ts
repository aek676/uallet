import { type Address, getBase64EncodedWireTransaction } from "@solana/kit";

import type { Token } from "@repo/payments/config";
import {
  findTransferRequestProblem,
  parseChargeQuery,
  type TransferRequest,
  TransferRequestError,
} from "@repo/payments/solana-pay";
import { buildPaymentTransaction } from "@repo/payments/transfer";

import type { GetLatestBlockhash } from "#/lib/solana-rpc";

export type PaymentBuilderDeps = {
  getLatestBlockhash: GetLatestBlockhash;
  token: Token;
};

export type BuildPaymentResult =
  | { ok: true; request: TransferRequest; transaction: string }
  | { ok: false; error: "invalid_charge"; reason: string }
  | { ok: false; error: "rpc_unavailable"; cause: unknown };

export type BuildPayment = (
  account: Address,
  charge: URLSearchParams,
) => Promise<BuildPaymentResult>;

export function createPaymentBuilder({
  getLatestBlockhash,
  token,
}: PaymentBuilderDeps): BuildPayment {
  return async (account, charge) => {
    let request: TransferRequest;
    try {
      request = parseChargeQuery(charge, token.decimals);
    } catch (error) {
      if (error instanceof TransferRequestError) {
        return { ok: false, error: "invalid_charge", reason: error.message };
      }
      throw error;
    }

    const problem = findTransferRequestProblem(request, {
      payer: account,
      token,
    });
    if (problem !== null) {
      return { ok: false, error: "invalid_charge", reason: problem };
    }

    let lifetime: Awaited<ReturnType<GetLatestBlockhash>>;
    try {
      lifetime = await getLatestBlockhash();
    } catch (cause) {
      return { ok: false, error: "rpc_unavailable", cause };
    }

    const transaction = await buildPaymentTransaction({
      request,
      payer: account,
      token,
      lifetime,
    });
    return {
      ok: true,
      request,
      transaction: getBase64EncodedWireTransaction(transaction),
    };
  };
}
