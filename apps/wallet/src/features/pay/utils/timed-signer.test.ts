import {
  address,
  createNoopSigner,
  type TransactionModifyingSigner,
} from "@solana/kit";
import { describe, expect, it, vi } from "vitest";

import { withSignTiming } from "#/features/pay/utils/timed-signer";

type Sign = TransactionModifyingSigner["modifyAndSignTransactions"];

const ADDRESS = address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7");

/** What the fake wallet returns: the tests only check it's passed along. */
const SIGNED: Awaited<ReturnType<Sign>> = [];

function listener() {
  return { onStart: vi.fn<() => void>(), onEnd: vi.fn<() => void>() };
}

function walletSigner(
  modifyAndSignTransactions: Sign,
): TransactionModifyingSigner {
  return { address: ADDRESS, modifyAndSignTransactions };
}

async function signWith(
  signer: ReturnType<typeof withSignTiming>,
  ...args: Parameters<Sign>
) {
  if (!("modifyAndSignTransactions" in signer)) {
    throw new Error("Not a modifying signer");
  }
  return signer.modifyAndSignTransactions(...args);
}

describe("withSignTiming", () => {
  it("reports the start before signing and the end after", async () => {
    const calls: string[] = [];
    const signer = withSignTiming(
      walletSigner(() => {
        calls.push("sign");
        return Promise.resolve(SIGNED);
      }),
      {
        onStart: () => calls.push("start"),
        onEnd: () => calls.push("end"),
      },
    );

    await signWith(signer, []);

    expect(calls).toEqual(["start", "sign", "end"]);
  });

  it("keeps the address and passes arguments and result along", async () => {
    const wallet = vi.fn<Sign>(() => Promise.resolve(SIGNED));
    const signer = withSignTiming(walletSigner(wallet), listener());
    const transactions: Parameters<Sign>[0] = [];
    const config = { abortSignal: new AbortController().signal };

    expect(signer.address).toBe(ADDRESS);
    await expect(signWith(signer, transactions, config)).resolves.toBe(SIGNED);
    expect(wallet).toHaveBeenCalledExactlyOnceWith(transactions, config);
  });

  it("reports the end when signing fails, and rethrows", async () => {
    const events = listener();
    const signer = withSignTiming(
      walletSigner(() => Promise.reject(new Error("rejected"))),
      events,
    );

    await expect(signWith(signer, [])).rejects.toThrow("rejected");
    expect(events.onStart).toHaveBeenCalledTimes(1);
    expect(events.onEnd).toHaveBeenCalledTimes(1);
  });

  it("returns other kinds of signers as they are", () => {
    const signer = createNoopSigner(ADDRESS);

    expect(withSignTiming(signer, listener())).toBe(signer);
  });
});
