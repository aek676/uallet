/**
 * Solana Pay transaction requests: the payment link shown as a QR code.
 *
 * `solana:<link>`, where `link` is the API's payment endpoint with the charge
 * in its query, URL-encoded as the spec requires:
 *
 * `solana:https%3A%2F%2Fapi.example%2Fpay%3Frecipient%3D…%26amount%3D1.2…`
 *
 * The wallet sends `POST <link> { account }` and gets back the transaction to
 * sign. The query is ours, not the spec's: `recipient`, `amount`,
 * `spl-token`, `reference` (repeatable), `label` and `message`, with the same
 * meaning as in a transfer request.
 *
 * The link must be HTTPS, as the spec requires: a link is only valid if it
 * points to the endpoint, and the root `.env.schema` derives the endpoint
 * (`VITE_PAYMENT_REQUEST_URL`) from `API_PUBLIC_URL`, which only allows HTTPS,
 * or plain HTTP to `localhost` for development.
 *
 * Unlike the spec, our wallet doesn't send the `POST` to the link's own URL:
 * it pays only links to one endpoint, reads the charge from the query, and
 * sends that charge to its own API. The endpoint and the API must be the same
 * server: the root `.env.schema` derives both from `API_PUBLIC_URL`.
 *
 * Spec: https://solana.com/docs/tools/solana-pay/specification/version1#specification-transaction-request
 */
import { type Address, isAddress } from "@solana/kit";

import { fromBaseUnits, toBaseUnits } from "./amount";
import type { Token } from "./config";

const PROTOCOL = "solana:";
const SINGLE_VALUE_PARAMS = [
  "recipient",
  "amount",
  "spl-token",
  "label",
  "message",
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
}

export class TransferRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TransferRequestError";
  }
}

export type ChargeQuery = {
  recipient: string;
  amount: string;
  "spl-token": string;
  reference: string[];
  label?: string;
  message?: string;
};

function assertPositive(amount: bigint): void {
  if (amount <= 0n) {
    throw new TransferRequestError("Amount must be greater than zero");
  }
}

export function toChargeQuery(
  request: TransferRequest,
  decimals: number,
): ChargeQuery {
  assertPositive(request.amount);

  const query: ChargeQuery = {
    recipient: request.recipient,
    amount: fromBaseUnits(request.amount, decimals),
    "spl-token": request.splToken,
    reference: [...request.reference],
  };
  if (request.label !== undefined) query.label = request.label;
  if (request.message !== undefined) query.message = request.message;
  return query;
}

function encodeQuery(query: ChargeQuery): string {
  const params: [string, string][] = [
    ["recipient", query.recipient],
    ["amount", query.amount],
    ["spl-token", query["spl-token"]],
    ...query.reference.map((reference): [string, string] => [
      "reference",
      reference,
    ]),
  ];
  if (query.label !== undefined) params.push(["label", query.label]);
  if (query.message !== undefined) params.push(["message", query.message]);

  return params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}

function parseAddress(value: string, field: string): Address {
  if (!isAddress(value)) {
    throw new TransferRequestError(`Invalid ${field} address: "${value}"`);
  }
  return value;
}

function requiredParam(params: URLSearchParams, key: string): string {
  const value = params.get(key);
  if (value === null) {
    throw new TransferRequestError(`Missing "${key}" parameter`);
  }
  return value;
}

export function parseChargeQuery(
  params: URLSearchParams,
  decimals: number,
): TransferRequest {
  for (const key of SINGLE_VALUE_PARAMS) {
    if (params.getAll(key).length > 1) {
      throw new TransferRequestError(`Duplicate "${key}" parameter`);
    }
  }

  const recipient = parseAddress(
    requiredParam(params, "recipient"),
    "recipient",
  );

  const rawAmount = requiredParam(params, "amount");
  let amount: bigint;
  try {
    amount = toBaseUnits(rawAmount, decimals);
  } catch (error) {
    throw new TransferRequestError(`Invalid amount: "${rawAmount}"`, {
      cause: error,
    });
  }
  assertPositive(amount);

  const splToken = parseAddress(
    requiredParam(params, "spl-token"),
    "spl-token",
  );

  const reference = params
    .getAll("reference")
    .map((value) => parseAddress(value, "reference"));

  const request: TransferRequest = { recipient, amount, splToken, reference };
  const label = params.get("label");
  const message = params.get("message");
  if (label !== null) request.label = label;
  if (message !== null) request.message = message;
  return request;
}

function parseEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  if (url.search !== "" || url.hash !== "") {
    throw new TypeError(
      `The payment endpoint can't have a query or a hash: "${endpoint}"`,
    );
  }
  return url;
}

export function encodeTransactionRequest(
  endpoint: string,
  request: TransferRequest,
  decimals: number,
): string {
  const url = parseEndpoint(endpoint);
  url.search = encodeQuery(toChargeQuery(request, decimals));
  return `${PROTOCOL}${encodeURIComponent(url.href)}`;
}

export function parseTransactionRequest(
  link: string,
  endpoint: string,
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

  let request: URL;
  try {
    request = new URL(decodeURIComponent(url.pathname));
  } catch (error) {
    throw new TransferRequestError("Not a transaction request", {
      cause: error,
    });
  }

  const expected = parseEndpoint(endpoint);
  if (
    request.origin !== expected.origin ||
    request.pathname !== expected.pathname
  ) {
    throw new TransferRequestError(
      `Not a request to the payment endpoint: "${request.origin}${request.pathname}"`,
    );
  }

  return parseChargeQuery(request.searchParams, decimals);
}

export type TransferRequestProblem =
  | "wrong-token"
  | "no-reference"
  | "self-payment";

export function findTransferRequestProblem(
  request: TransferRequest,
  { payer, token }: { payer: Address; token: Pick<Token, "mint"> },
): TransferRequestProblem | null {
  if (request.splToken !== token.mint) return "wrong-token";
  if (request.reference.length === 0) return "no-reference";
  if (request.recipient === payer) return "self-payment";
  return null;
}
