import type { Address } from "@solana/kit";
import { z } from "zod";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import {
  encodeTransferRequest,
  parseTransferRequest,
  type TransferRequest,
  TransferRequestError,
} from "@repo/payments/solana-pay";

const INVALID_LINK = "Este enlace no es un cobro válido.";

/**
 * The `solana:` link of a transfer request, to hand it to another screen in
 * the URL. Rebuilt from the parsed request, it only carries what Uallet reads.
 */
export function toPaymentLink(request: TransferRequest): string {
  return encodeTransferRequest(request, PAYMENT_TOKEN.decimals);
}

function parseLink(value: string): TransferRequest | null {
  try {
    return parseTransferRequest(value, PAYMENT_TOKEN.decimals);
  } catch (error) {
    if (error instanceof TransferRequestError) return null;
    throw error;
  }
}

/** Why the wallet can't pay this request, or `null` if it can. */
function rejectionOf(request: TransferRequest, payer: Address): string | null {
  if (request.splToken !== PAYMENT_TOKEN.mint) {
    return `Este cobro no es en ${PAYMENT_TOKEN.symbol}.`;
  }
  if (request.reference.length === 0) {
    return "Este cobro no tiene referencia: el comercio no podría confirmarlo.";
  }
  // `buildPaymentInstructions` doesn't support memos.
  if (request.memo !== undefined) {
    return "Este cobro incluye un memo y Uallet no lo admite.";
  }
  if (request.recipient === payer) {
    return "No puedes pagarte a ti mismo.";
  }
  return null;
}

/**
 * Validates a scanned or pasted `solana:` link and transforms it into the
 * transfer request `payer` can pay. Links come from outside the app: this
 * only says the request is payable, not that the merchant is who it claims.
 */
export function createPaymentLinkSchema(payer: Address) {
  return z
    .string()
    .trim()
    .min(1, { error: "Pega el enlace de pago.", abort: true })
    .transform((value, ctx) => {
      const request = parseLink(value);
      const message = request ? rejectionOf(request, payer) : INVALID_LINK;
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
  if (link.trim() === "") return { success: false, message: INVALID_LINK };
  const result = createPaymentLinkSchema(payer).safeParse(link);
  return result.success
    ? { success: true, request: result.data }
    : {
        success: false,
        message: result.error.issues[0]?.message ?? INVALID_LINK,
      };
}
