import {
  type Address,
  address,
  blockhash,
  getBase64Encoder,
  getTransactionDecoder,
} from "@solana/kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";
import { toChargeQuery, type TransferRequest } from "@repo/payments/solana-pay";
import { buildPaymentTransaction } from "@repo/payments/transfer";

import { spyOnRequestLogs } from "#/lib/log-spy";
import { createSessionTokens } from "#/lib/session-token";
import type { GetLatestBlockhash } from "#/lib/solana-rpc";
import { sessionAuth } from "#/plugins/session-auth";
import { payRoutes } from "#/routes/pay/index";
import { createPaymentBuilder } from "#/routes/pay/service";

const PAYER = address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7");
const MERCHANT = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");
const LIFETIME = {
  blockhash: blockhash("EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N"),
  lastValidBlockHeight: 123_456_789n,
};

const charge: TransferRequest = {
  recipient: MERCHANT,
  amount: 1_200_000n,
  splToken: PAYMENT_TOKEN.mint,
  reference: [createReference()],
  label: "Cafetería Central",
  message: "Café con leche",
};

let logs: ReturnType<typeof spyOnRequestLogs>;

beforeEach(() => {
  logs = spyOnRequestLogs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeApp(
  getLatestBlockhash: GetLatestBlockhash = () => Promise.resolve(LIFETIME),
) {
  const sessions = createSessionTokens({
    key: crypto.getRandomValues(new Uint8Array(32)),
  });
  const app = payRoutes({
    buildPayment: createPaymentBuilder({
      getLatestBlockhash,
      token: PAYMENT_TOKEN,
    }),
    sessionAuth: sessionAuth(sessions),
  });
  return { app, sessions };
}

/** The query string of `request`, encoded as Eden encodes the wallet's. */
function queryOf(request: TransferRequest): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(
    toChargeQuery(request, PAYMENT_TOKEN.decimals),
  )) {
    const items = typeof value === "string" ? [value] : value;
    for (const item of items) params.append(key, item);
  }
  return params.toString();
}

async function post(
  { app, sessions }: ReturnType<typeof makeApp>,
  {
    query = queryOf(charge),
    account = PAYER,
    session = PAYER,
  }: { query?: string; account?: string; session?: Address | null } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (session !== null) {
    const { token } = await sessions.sign(session);
    headers.set("authorization", `Bearer ${token}`);
  }
  const response = await app.handle(
    new Request(`http://localhost/pay?${query}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ account }),
    }),
  );
  // Annotated, not asserted: `json()` is `any` with Bun's types and `unknown`
  // with Node's, and an assertion fails the lint with one of them.
  const body: unknown = await response.json();
  return { status: response.status, body };
}

describe("POST /pay", () => {
  it("answers with the unsigned payment transaction for the charge", async () => {
    const { status, body } = await post(makeApp());

    expect(status).toBe(200);
    const { transaction } = z
      .strictObject({ transaction: z.string() })
      .parse(body);

    const decoded = getTransactionDecoder().decode(
      getBase64Encoder().encode(transaction),
    );
    const expected = await buildPaymentTransaction({
      request: charge,
      payer: PAYER,
      token: PAYMENT_TOKEN,
      lifetime: LIFETIME,
    });
    expect(decoded.messageBytes).toEqual(expected.messageBytes);
    expect(decoded.signatures).toEqual({ [PAYER]: null });
  });

  it("logs the payment it built", async () => {
    await post(makeApp());

    expect(logs.info).toHaveBeenCalledWith(
      {
        address: PAYER,
        recipient: MERCHANT,
        amount: "1200000",
        reference: charge.reference,
      },
      "Payment transaction built",
    );
  });

  it("needs a session", async () => {
    expect(await post(makeApp(), { session: null })).toEqual({
      status: 401,
      body: { error: "invalid_session" },
    });
  });

  it("only builds payments for the session's own account, and logs it", async () => {
    expect(await post(makeApp(), { account: MERCHANT })).toEqual({
      status: 403,
      body: { error: "account_mismatch" },
    });
    expect(logs.warn).toHaveBeenCalledWith(
      { address: PAYER, account: MERCHANT },
      "Account mismatch",
    );
  });

  it("rejects an account that isn't an address", async () => {
    expect(await post(makeApp(), { account: "abc" })).toEqual({
      status: 400,
      body: { error: "invalid_body" },
    });
  });

  it.each([
    [
      "no reference",
      `recipient=${MERCHANT}&amount=1&spl-token=${PAYMENT_TOKEN.mint}`,
    ],
    [
      "no amount",
      `recipient=${MERCHANT}&spl-token=${PAYMENT_TOKEN.mint}&reference=${MERCHANT}`,
    ],
  ])("rejects a query with %s", async (_, query) => {
    expect(await post(makeApp(), { query })).toEqual({
      status: 400,
      body: { error: "invalid_query" },
    });
  });

  it.each([
    ["in another token", queryOf({ ...charge, splToken: createReference() })],
    ["to the payer", queryOf({ ...charge, recipient: PAYER })],
    [
      "with an invalid amount",
      queryOf(charge).replace("amount=1.2", "amount=1%2C2"),
    ],
    ["with two amounts", `${queryOf(charge)}&amount=100`],
    ["with an invalid reference", `${queryOf(charge)}&reference=abc`],
  ])("rejects a charge %s", async (_, query) => {
    expect(await post(makeApp(), { query })).toEqual({
      status: 400,
      body: { error: "invalid_charge" },
    });
  });

  it("answers 503 if the RPC fails, and logs it", async () => {
    const cause = new Error("fetch failed");

    expect(await post(makeApp(() => Promise.reject(cause)))).toEqual({
      status: 503,
      body: { error: "rpc_unavailable" },
    });
    expect(logs.warn).toHaveBeenCalledWith(
      { address: PAYER, err: cause },
      "Couldn't read the latest blockhash",
    );
  });
});
