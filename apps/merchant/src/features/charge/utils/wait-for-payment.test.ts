import {
  type Address,
  address,
  type Signature,
  signature,
  stringifiedBigInt,
  stringifiedNumber,
  type TokenBalance,
} from "@solana/kit";
import { describe, expect, it, vi } from "vitest";

import { EURC } from "@repo/payments/config";
import { createReference } from "@repo/payments/reference";
import type { TransferRequest } from "@repo/payments/solana-pay";
import type { PaymentTransaction } from "@repo/payments/validate-payment";

import {
  type PaymentCandidate,
  type PaymentSource,
  waitForPayment,
} from "#/features/charge/utils/wait-for-payment";

const MERCHANT = address("xUo5vVMjVwiEGZurUHqbX27PXFjiSaKqKQ5rj8d52Ct");
const STUDENT = address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7");

const SIG_A = signature(
  "2eQV3QW28jCTtWUjK8Fvc41Nq2k3i3iR9MXja1fBynPhmLy6qt1LBGAyfgeGtMy1zDEEeXZb2e1T3tswtE648C6v",
);
const SIG_B = signature(
  "BVyRxLQLRMQuW3rishL3MLF97KVXCkX2ebwZhEunC5o5ZTUHXJamkonoSpdk79Rt7uLkF14VCT3TgUm7ynCaG9g",
);

const AMOUNT = 1_200_000n;
const REFERENCE = createReference();

const request: TransferRequest = {
  recipient: MERCHANT,
  amount: AMOUNT,
  splToken: EURC.mint,
  reference: [REFERENCE],
};

function balance(owner: Address, amount: bigint): TokenBalance {
  return {
    accountIndex: 1,
    mint: EURC.mint,
    owner,
    programId: EURC.programAddress,
    uiTokenAmount: {
      amount: stringifiedBigInt(amount.toString()),
      decimals: EURC.decimals,
      uiAmount: null,
      uiAmountString: stringifiedNumber("0"),
    },
  };
}

/** A successful transaction that mentions the reference and pays `amount`. */
function payment(amount = AMOUNT): PaymentTransaction {
  return {
    meta: {
      err: null,
      preTokenBalances: [balance(MERCHANT, 0n)],
      postTokenBalances: [balance(MERCHANT, amount)],
    },
    transaction: { message: { accountKeys: [STUDENT, MERCHANT, REFERENCE] } },
  };
}

/** SIG_A pays one base unit less than the charge; anything else pays it. */
function onlySigAIsShort(sig: Signature) {
  return Promise.resolve(payment(sig === SIG_A ? AMOUNT - 1n : AMOUNT));
}

function candidate(sig: Signature, err: unknown = null): PaymentCandidate {
  return { signature: sig, err };
}

/** A source whose subscription the test pushes candidates into, or breaks. */
function fakeSource() {
  const queue: (PaymentCandidate | Error)[] = [];
  let wake: (() => void) | undefined;

  async function* subscription(abortSignal: AbortSignal) {
    while (!abortSignal.aborted) {
      const item = queue.shift();
      if (item instanceof Error) throw item;
      if (item) {
        yield item;
      } else {
        await new Promise<void>((resolve) => {
          wake = resolve;
          abortSignal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
      }
    }
  }

  const source = {
    watch: vi.fn<PaymentSource["watch"]>((_, abortSignal) =>
      Promise.resolve(subscription(abortSignal)),
    ),
    getEarlier: vi.fn<PaymentSource["getEarlier"]>(() => Promise.resolve([])),
    getTransaction: vi.fn<PaymentSource["getTransaction"]>(() =>
      Promise.resolve(payment()),
    ),
  };

  function notify(item: PaymentCandidate | Error) {
    queue.push(item);
    wake?.();
  }

  /** The signal the subscription was opened with. */
  function subscriptionSignal(): AbortSignal | undefined {
    return source.watch.mock.calls[0]?.[1];
  }

  return { source, notify, subscriptionSignal };
}

function options() {
  return {
    abortSignal: new AbortController().signal,
    retryDelaysMs: [0, 0],
    lookBackIntervalMs: 1,
  };
}

describe("waitForPayment", () => {
  it("resolves when a notified transaction pays the charge", async () => {
    const { source, notify } = fakeSource();
    const before = Date.now();

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));
    const detected = await paid;

    expect(detected.signature).toBe(SIG_A);
    expect(detected.detectedAt).toBeGreaterThanOrEqual(before);
    expect(source.watch.mock.calls[0]?.[0]).toBe(REFERENCE);
    expect(source.getTransaction.mock.calls[0]?.[0]).toBe(SIG_A);
  });

  it("finds a payment that landed before subscribing", async () => {
    const { source } = fakeSource();
    source.getEarlier.mockResolvedValue([candidate(SIG_A)]);

    const detected = await waitForPayment(source, request, EURC, options());

    expect(detected.signature).toBe(SIG_A);
    expect(source.getEarlier.mock.calls[0]?.[0]).toBe(REFERENCE);
  });

  it("finds a payment whose notification never arrived", async () => {
    const { source } = fakeSource();
    source.getEarlier
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([candidate(SIG_A)]);

    const detected = await waitForPayment(source, request, EURC, options());

    expect(detected.signature).toBe(SIG_A);
    expect(source.getEarlier.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("tolerates failed look-backs that aren't in a row", async () => {
    const { source } = fakeSource();
    source.getEarlier
      .mockRejectedValueOnce(new Error("429"))
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("429"))
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValue([candidate(SIG_A)]);

    const detected = await waitForPayment(source, request, EURC, options());

    expect(detected.signature).toBe(SIG_A);
  });

  it("rejects after three failed look-backs in a row", async () => {
    const { source } = fakeSource();
    source.getEarlier.mockRejectedValue(new Error("429"));

    await expect(
      waitForPayment(source, request, EURC, options()),
    ).rejects.toThrow("429");
    expect(source.getEarlier).toHaveBeenCalledTimes(3);
  });

  it("subscribes before looking for earlier payments", async () => {
    const { source } = fakeSource();
    source.getEarlier.mockResolvedValue([candidate(SIG_A)]);

    await waitForPayment(source, request, EURC, options());

    const [subscribed] = source.watch.mock.invocationCallOrder;
    const [lookedBack] = source.getEarlier.mock.invocationCallOrder;
    expect(subscribed).toBeLessThan(lookedBack ?? 0);
  });

  it("ignores failed transactions without fetching them", async () => {
    const { source, notify } = fakeSource();

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A, { InstructionError: [2, "Custom"] }));
    notify(candidate(SIG_B));

    expect((await paid).signature).toBe(SIG_B);
    expect(source.getTransaction).toHaveBeenCalledTimes(1);
  });

  it("ignores a transaction that doesn't pay the charge and keeps waiting", async () => {
    const { source, notify } = fakeSource();
    source.getTransaction.mockImplementation(onlySigAIsShort);

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));
    notify(candidate(SIG_B));

    expect((await paid).signature).toBe(SIG_B);
  });

  it("retries while the RPC doesn't have the transaction yet", async () => {
    const { source, notify } = fakeSource();
    source.getTransaction
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(payment());

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));

    expect((await paid).signature).toBe(SIG_A);
    expect(source.getTransaction).toHaveBeenCalledTimes(3);
  });

  it("rejects when the transaction never becomes available", async () => {
    const { source, notify } = fakeSource();
    source.getTransaction.mockResolvedValue(null);

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));

    await expect(paid).rejects.toThrow("is not available");
    expect(source.getTransaction).toHaveBeenCalledTimes(3);
  });

  it("checks a transaction once, even if it arrives twice", async () => {
    const { source, notify } = fakeSource();
    source.getEarlier.mockResolvedValue([candidate(SIG_A)]);
    source.getTransaction.mockImplementation(onlySigAIsShort);

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));
    notify(candidate(SIG_B));

    expect((await paid).signature).toBe(SIG_B);
    expect(source.getTransaction).toHaveBeenCalledTimes(2);
  });

  it("rejects when the subscription breaks", async () => {
    const { source, notify } = fakeSource();

    const paid = waitForPayment(source, request, EURC, options());
    notify(new Error("socket closed"));

    await expect(paid).rejects.toThrow("socket closed");
  });

  it("rejects when it can't subscribe", async () => {
    const { source } = fakeSource();
    source.watch.mockRejectedValue(new Error("no connection"));

    await expect(
      waitForPayment(source, request, EURC, options()),
    ).rejects.toThrow("no connection");
    expect(source.getEarlier).not.toHaveBeenCalled();
  });

  it("rejects when a request fails", async () => {
    const { source, notify } = fakeSource();
    source.getTransaction.mockRejectedValue(new Error("429"));

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));

    await expect(paid).rejects.toThrow("429");
  });

  it("rejects with the abort reason and stops listening", async () => {
    const controller = new AbortController();
    const { source, subscriptionSignal } = fakeSource();

    const paid = waitForPayment(source, request, EURC, {
      abortSignal: controller.signal,
    });
    await vi.waitFor(() => expect(source.getEarlier).toHaveBeenCalled());
    controller.abort(new Error("unmounted"));

    await expect(paid).rejects.toThrow("unmounted");
    expect(subscriptionSignal()?.aborted).toBe(true);
  });

  it("stops listening once paid", async () => {
    const { source, notify, subscriptionSignal } = fakeSource();

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));
    await paid;

    expect(subscriptionSignal()?.aborted).toBe(true);
  });

  it("stops listening when it fails", async () => {
    const { source, notify, subscriptionSignal } = fakeSource();
    source.getTransaction.mockRejectedValue(new Error("429"));

    const paid = waitForPayment(source, request, EURC, options());
    notify(candidate(SIG_A));

    await expect(paid).rejects.toThrow("429");
    expect(subscriptionSignal()?.aborted).toBe(true);
  });

  it("reports while it checks a candidate", async () => {
    const { source, notify } = fakeSource();
    source.getTransaction.mockImplementation(onlySigAIsShort);
    const onChecking = vi.fn<(checking: boolean) => void>();

    const paid = waitForPayment(source, request, EURC, {
      ...options(),
      onChecking,
    });
    notify(candidate(SIG_A));
    await vi.waitFor(() => expect(onChecking).toHaveBeenCalledTimes(2));
    expect(onChecking.mock.calls).toEqual([[true], [false]]);

    notify(candidate(SIG_B));
    await paid;
    expect(onChecking.mock.calls).toEqual([[true], [false], [true], [false]]);
  });

  it("throws for a charge without reference", async () => {
    const { source } = fakeSource();

    await expect(
      waitForPayment(source, { ...request, reference: [] }, EURC, options()),
    ).rejects.toThrow("no reference");
    expect(source.watch).not.toHaveBeenCalled();
  });
});
