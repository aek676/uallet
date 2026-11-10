import type { Address } from "@solana/kit";

import { PAYMENT_TOKEN, type Token } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";
import {
  encodeTransferRequest,
  type TransferRequest,
} from "@repo/payments/solana-pay";

import type { Merchant } from "#/config/merchant";

export interface Charge {
  request: TransferRequest;
  reference: Address;
  url: string;
}

export interface CreateChargeInput {
  merchant: Merchant;
  amount: bigint;
  concept?: string;
  token?: Pick<Token, "mint" | "decimals">;
}

/**
 * A new charge: a fresh `reference` and the Solana Pay link the student
 * scans. Every call creates a new reference, so two charges of the same
 * amount can't be confused.
 */
export function createCharge({
  merchant,
  amount,
  concept,
  token = PAYMENT_TOKEN,
}: CreateChargeInput): Charge {
  const reference = createReference();
  const message = concept?.trim();

  const request: TransferRequest = {
    recipient: merchant.address,
    amount,
    splToken: token.mint,
    reference: [reference],
    label: merchant.name,
    ...(message ? { message } : {}),
  };

  return {
    request,
    reference,
    url: encodeTransferRequest(request, token.decimals),
  };
}
