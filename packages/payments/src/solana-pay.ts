/**
 * Solana Pay transfer requests: the payment link shown as a QR code.
 *
 * `solana:<recipient>?amount=1.2&spl-token=<mint>&reference=<ref>&label=...`
 *
 * Spec: https://docs.solanapay.com/spec#transfer-request
 */
import { type Address, isAddress } from "@solana/kit";

import { fromBaseUnits, toBaseUnits } from "./amount";

const PROTOCOL = "solana:";
const SINGLE_VALUE_PARAMS = [
  "amount",
  "spl-token",
  "label",
  "message",
  "memo",
] as const;

export interface TransferRequest {
  /** Merchant wallet that receives the tokens. */
  recipient: Address;
  /** Amount in base units of `splToken`. Always greater than zero. */
  amount: bigint;
  /**
   * Mint of the token to transfer. Works for both Token programs: the link
   * only carries the mint, the program comes from the token config
   * (`PAYMENT_TOKEN.programAddress`).
   */
  splToken: Address;
  /** Read-only accounts added to the transaction to find it later. */
  reference: Address[];
  /** Merchant name, e.g. "Cafetería Central". */
  label?: string;
  /** Purchase description, e.g. "Café con leche". */
  message?: string;
  /** Memo stored on-chain with the transaction. */
  memo?: string;
}

/** The link is not a valid transfer request (show "invalid QR" to the user). */
export class TransferRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TransferRequestError";
  }
}

function assertPositive(amount: bigint): void {
  if (amount <= 0n) {
    throw new TransferRequestError("Amount must be greater than zero");
  }
}

/** Builds the `solana:` link for a transfer request. */
export function encodeTransferRequest(
  request: TransferRequest,
  decimals: number,
): string {
  assertPositive(request.amount);

  const params: [string, string][] = [
    ["amount", fromBaseUnits(request.amount, decimals)],
    ["spl-token", request.splToken],
    ...request.reference.map((reference): [string, string] => [
      "reference",
      reference,
    ]),
  ];
  if (request.label !== undefined) params.push(["label", request.label]);
  if (request.message !== undefined) params.push(["message", request.message]);
  if (request.memo !== undefined) params.push(["memo", request.memo]);

  // Not `URLSearchParams`: it encodes spaces as `+`, the spec requires `%20`.
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${PROTOCOL}${request.recipient}?${query}`;
}

function parseAddress(value: string, field: string): Address {
  if (!isAddress(value)) {
    throw new TransferRequestError(`Invalid ${field} address: "${value}"`);
  }
  return value;
}

/** Parses and validates a scanned `solana:` link. */
export function parseTransferRequest(
  link: string,
  decimals: number,
): TransferRequest {
  let url: URL;
  try {
    url = new URL(link);
  } catch (error) {
    throw new TransferRequestError("Not a valid URL", { cause: error });
  }

  if (url.protocol !== PROTOCOL) {
    throw new TransferRequestError(`Not a Solana Pay link: "${url.protocol}"`);
  }
  // Transaction requests (`solana:https://...`) fetch the transaction from a
  // server. Out of scope for now.
  if (/^https?(?::|%3A)/i.test(url.pathname)) {
    throw new TransferRequestError("Transaction requests are not supported");
  }

  const params = url.searchParams;
  for (const key of SINGLE_VALUE_PARAMS) {
    if (params.getAll(key).length > 1) {
      throw new TransferRequestError(`Duplicate "${key}" parameter`);
    }
  }

  const recipient = parseAddress(url.pathname, "recipient");

  const rawAmount = params.get("amount");
  if (rawAmount === null) {
    throw new TransferRequestError('Missing "amount" parameter');
  }
  let amount: bigint;
  try {
    amount = toBaseUnits(rawAmount, decimals);
  } catch (error) {
    throw new TransferRequestError(`Invalid amount: "${rawAmount}"`, {
      cause: error,
    });
  }
  assertPositive(amount);

  const rawSplToken = params.get("spl-token");
  if (rawSplToken === null) {
    throw new TransferRequestError('Missing "spl-token" parameter');
  }
  const splToken = parseAddress(rawSplToken, "spl-token");

  const reference = params
    .getAll("reference")
    .map((value) => parseAddress(value, "reference"));

  const request: TransferRequest = { recipient, amount, splToken, reference };
  const label = params.get("label");
  const message = params.get("message");
  const memo = params.get("memo");
  if (label !== null) request.label = label;
  if (message !== null) request.message = message;
  if (memo !== null) request.memo = memo;
  return request;
}
