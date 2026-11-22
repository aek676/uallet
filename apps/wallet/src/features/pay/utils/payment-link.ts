import type { Address } from "@solana/kit";
import { z } from "zod";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import {
  encodeTransactionRequest,
  findTransferRequestProblem,
  parseTransactionRequest,
  type TransferRequest,
  TransferRequestError,
  type TransferRequestProblem,
} from "@repo/payments/solana-pay";

import { ENV } from "#/config/env";
import { m } from "#/paraglide/messages.js";

/**
 * The `solana:` link of a charge, to hand it to another screen in the URL.
 * Rebuilt from the parsed request, it only carries what Uallet reads.
 */
export function toPaymentLink(request: TransferRequest): string {
  return encodeTransactionRequest(
    ENV.paymentRequestUrl,
    request,
    PAYMENT_TOKEN.decimals,
  );
}

function parseLink(value: string): TransferRequest | null {
  try {
    return parseTransactionRequest(
      value,
      ENV.paymentRequestUrl,
      PAYMENT_TOKEN.decimals,
    );
  } catch (error) {
    if (error instanceof TransferRequestError) return null;
    throw error;
  }
}

const PROBLEM_MESSAGES: Record<TransferRequestProblem, () => string> = {
  "wrong-token": () =>
    m.wallet_link_wrong_token({ token: PAYMENT_TOKEN.symbol }),
  "no-reference": m.wallet_link_no_reference,
  "self-payment": m.wallet_link_self,
};

/** Why the wallet can't pay this request, or `null` if it can. */
function rejectionOf(request: TransferRequest, payer: Address): string | null {
  const problem = findTransferRequestProblem(request, {
    payer,
    token: PAYMENT_TOKEN,
  });
  return problem === null ? null : PROBLEM_MESSAGES[problem]();
}

/**
 * Validates a scanned or pasted `solana:` link and transforms it into the
 * charge `payer` can pay. Only transaction requests to our API's payment
 * endpoint are charges. Links come from outside the app: this only says the
 * charge is payable, not that the merchant is who it claims.
 */
export function createPaymentLinkSchema(payer: Address) {
  return z
    .string()
    .trim()
    .min(1, { error: () => m.wallet_link_required(), abort: true })
    .transform((value, ctx) => {
      const request = parseLink(value);
      const message = request
        ? rejectionOf(request, payer)
        : m.wallet_link_invalid();
      if (!request || message) {
        ctx.issues.push({
          code: "custom",
          message: message ?? "",
          input: value,
        });
        return z.NEVER;
      }
      return request;
    });
}

export type PaymentLinkCheck =
  | { success: true; request: TransferRequest }
  | { success: false; message: string };

/**
 * Checks a link that came in the URL, like `createPaymentLinkSchema`. An
 * empty one is just an invalid link: nobody pasted it.
 */
export function checkPaymentLink(
  link: string,
  payer: Address,
): PaymentLinkCheck {
  if (link.trim() === "")
    return { success: false, message: m.wallet_link_invalid() };
  const result = createPaymentLinkSchema(payer).safeParse(link);
  return result.success
    ? { success: true, request: result.data }
    : {
        success: false,
        message: result.error.issues[0]?.message ?? m.wallet_link_invalid(),
      };
}
