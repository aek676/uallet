import {
  type Address,
  address,
  stringifiedBigInt,
  stringifiedNumber,
  type TokenBalance,
} from "@solana/kit";
import { describe, expect, it } from "vitest";

import { EURC, TOKEN_2022_PROGRAM_ADDRESS } from "./config";
import paymentOneEurcJson from "./fixtures/payment-1-eurc.json";
import paymentCreatesAccountJson from "./fixtures/payment-creates-account.json";
import paymentJson from "./fixtures/payment.json";
import { createReference } from "./reference";
import type { TransferRequest } from "./solana-pay";
import { type PaymentTransaction, validatePayment } from "./validate-payment";

// Real devnet payments from the wallet app to the merchant app.
const MERCHANT = address("xUo5vVMjVwiEGZurUHqbX27PXFjiSaKqKQ5rj8d52Ct");
const STUDENT = address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7");

type Fixture = PaymentTransaction & { reference: Address[] };
type FixtureJson = typeof paymentJson;

function tokenBalance(
  json: FixtureJson["meta"]["preTokenBalances"][number],
): TokenBalance {
  return {
    ...json,
    mint: address(json.mint),
    owner: address(json.owner),
    programId: address(json.programId),
    uiTokenAmount: {
      ...json.uiTokenAmount,
      amount: stringifiedBigInt(json.uiTokenAmount.amount),
      uiAmountString: stringifiedNumber(json.uiTokenAmount.uiAmountString),
    },
  };
}

/** Parses the plain strings of a JSON fixture into Kit's branded types. */
function load({ meta, reference, transaction }: FixtureJson): Fixture {
  return {
    reference: reference.map((key) => address(key)),
    meta: {
      ...meta,
      preTokenBalances: meta.preTokenBalances.map(tokenBalance),
      postTokenBalances: meta.postTokenBalances.map(tokenBalance),
    },
    transaction: {
      message: {
        accountKeys: transaction.message.accountKeys.map((key) => address(key)),
      },
    },
  };
}

const payment = load(paymentJson);
const paymentCreatesAccount = load(paymentCreatesAccountJson);
const paymentOneEurc = load(paymentOneEurcJson);

function requestFor(fixture: Fixture, amount: bigint): TransferRequest {
  return {
    recipient: MERCHANT,
    amount,
    splToken: EURC.mint,
    reference: [...fixture.reference],
  };
}

/** A deep copy to modify, so tests don't share state. */
function copy(fixture: Fixture): Fixture {
  return structuredClone(fixture);
}

describe("validatePayment", () => {
  it.each([
    ["a payment", payment, 10_000n],
    [
      "the payment that created the merchant's account",
      paymentCreatesAccount,
      10_000n,
    ],
    ["a 1 EURC payment", paymentOneEurc, 1_000_000n],
  ])("accepts %s", (_, fixture, amount) => {
    expect(validatePayment(fixture, requestFor(fixture, amount), EURC)).toEqual(
      {
        valid: true,
      },
    );
  });

  it("rejects a transaction without metadata", () => {
    const tx = { ...copy(payment), meta: null };
    expect(validatePayment(tx, requestFor(payment, 10_000n), EURC)).toEqual({
      valid: false,
      reason: "no-status",
    });
  });

  it("rejects a failed transaction", () => {
    const tx = copy(payment);
    tx.meta = { ...tx.meta!, err: { InstructionError: [2, "Custom"] } };
    expect(validatePayment(tx, requestFor(payment, 10_000n), EURC)).toEqual({
      valid: false,
      reason: "failed",
    });
  });

  it("rejects a transaction without the reference", () => {
    const request = {
      ...requestFor(payment, 10_000n),
      reference: [createReference()],
    };
    expect(validatePayment(payment, request, EURC)).toEqual({
      valid: false,
      reason: "missing-reference",
    });
  });

  it("requires every reference", () => {
    const request = requestFor(payment, 10_000n);
    request.reference.push(createReference());
    expect(validatePayment(payment, request, EURC)).toMatchObject({
      reason: "missing-reference",
    });
  });

  it("finds the reference in address lookup tables too", () => {
    const tx = copy(payment);
    const [reference] = tx.reference;
    tx.transaction.message.accountKeys =
      tx.transaction.message.accountKeys.filter((key) => key !== reference);
    tx.meta!.loadedAddresses = { readonly: [reference], writable: [] };
    expect(validatePayment(tx, requestFor(payment, 10_000n), EURC)).toEqual({
      valid: true,
    });
  });

  it.each([1n, 9_999n, 10_001n, 1_000_000n])(
    "rejects an amount other than the exact one (%s)",
    (amount) => {
      expect(
        validatePayment(payment, requestFor(payment, amount), EURC),
      ).toEqual({
        valid: false,
        reason: "wrong-amount",
        received: 10_000n,
      });
    },
  );

  it("rejects a payment to someone else", () => {
    const request = {
      ...requestFor(payment, 10_000n),
      recipient: createReference(),
    };
    expect(validatePayment(payment, request, EURC)).toEqual({
      valid: false,
      reason: "wrong-amount",
      received: 0n,
    });
  });

  it("doesn't count what the payer lost as received", () => {
    const request = { ...requestFor(payment, 10_000n), recipient: STUDENT };
    expect(validatePayment(payment, request, EURC)).toEqual({
      valid: false,
      reason: "wrong-amount",
      received: -10_000n,
    });
  });

  it.each([0n, -10_000n])("throws for a non-positive amount (%s)", (amount) => {
    expect(() =>
      validatePayment(payment, requestFor(payment, amount), EURC),
    ).toThrow(RangeError);
  });

  it("rejects another mint", () => {
    const request = {
      ...requestFor(payment, 10_000n),
      splToken: createReference(),
    };
    expect(validatePayment(payment, request, EURC)).toMatchObject({
      reason: "wrong-amount",
      received: 0n,
    });
  });

  it("rejects the same mint on another token program", () => {
    expect(
      validatePayment(payment, requestFor(payment, 10_000n), {
        programAddress: TOKEN_2022_PROGRAM_ADDRESS,
      }),
    ).toMatchObject({ reason: "wrong-amount", received: 0n });
  });

  it("ignores balances without owner or program", () => {
    const tx = copy(payment);
    tx.meta!.postTokenBalances = tx.meta!.postTokenBalances!.map(
      ({ accountIndex, mint, programId, uiTokenAmount }) => ({
        accountIndex,
        mint,
        programId,
        uiTokenAmount,
      }),
    );
    expect(
      validatePayment(tx, requestFor(payment, 10_000n), EURC),
    ).toMatchObject({
      reason: "wrong-amount",
    });
  });
});
