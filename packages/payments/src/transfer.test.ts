import { getTransferCheckedInstructionDataDecoder } from "@solana-program/token";
import {
  AccountRole,
  address,
  blockhash,
  createNoopSigner,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  getTransactionEncoder,
} from "@solana/kit";
import { describe, expect, it } from "vitest";

import {
  EURC,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  type Token,
} from "./config";
import { createReference } from "./reference";
import type { TransferRequest } from "./solana-pay";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  getAssociatedTokenAddress,
} from "./token-account";
import {
  buildPaymentInstructions,
  buildPaymentTransaction,
  PAYMENT_TRANSFER_INDEX,
} from "./transfer";

const payer = createNoopSigner(
  address("2sfAeaW2jwkP53mG4iaMKUJFG5Xvo5ms5Taqmne5Pyv7"),
);
const recipient = address("DuYQKfdunafuUqS7h6gugadrAiprxwtwBZFZLAMk4A99");

function requestFor(token: Pick<Token, "mint">): TransferRequest {
  return {
    recipient,
    amount: 1_200_000n,
    splToken: token.mint,
    reference: [createReference()],
    label: "Cafetería Central",
  };
}

describe("buildPaymentInstructions", () => {
  it("creates the recipient's token account first and transfers last", async () => {
    const instructions = await buildPaymentInstructions({
      request: requestFor(EURC),
      payer,
      token: EURC,
    });

    expect(instructions.map((ix) => ix.programAddress)).toEqual([
      ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
      TOKEN_PROGRAM_ADDRESS,
    ]);
  });

  it("transfers the exact amount between the token accounts", async () => {
    const instructions = await buildPaymentInstructions({
      request: requestFor(EURC),
      payer,
      token: EURC,
    });

    const transfer = instructions[1];

    expect(transfer.accounts?.slice(0, 4).map((a) => a.address)).toEqual([
      await getAssociatedTokenAddress(payer.address, EURC),
      EURC.mint,
      await getAssociatedTokenAddress(recipient, EURC),
      payer.address,
    ]);
    expect(transfer.accounts?.[3]?.role).toBe(AccountRole.READONLY_SIGNER);

    const data = getTransferCheckedInstructionDataDecoder().decode(
      transfer.data!,
    );
    expect(data.amount).toBe(1_200_000n);
    expect(data.decimals).toBe(EURC.decimals);
  });

  it("appends the references as read-only accounts, in order", async () => {
    const reference = [createReference(), createReference()];
    const instructions = await buildPaymentInstructions({
      request: { ...requestFor(EURC), reference },
      payer,
      token: EURC,
    });

    expect(instructions[1].accounts?.slice(4)).toEqual(
      reference.map((account) => ({
        address: account,
        role: AccountRole.READONLY,
      })),
    );
  });

  it("creates the recipient's account paid by the student", async () => {
    const instructions = await buildPaymentInstructions({
      request: requestFor(EURC),
      payer,
      token: EURC,
    });
    const accounts = instructions[0].accounts!;

    expect(accounts[0]?.address).toBe(payer.address);
    expect(accounts[0]?.role).toBe(AccountRole.WRITABLE_SIGNER);
    expect(accounts[1]?.address).toBe(
      await getAssociatedTokenAddress(recipient, EURC),
    );
    expect(accounts[2]?.address).toBe(recipient);
    expect(accounts[3]?.address).toBe(EURC.mint);
  });

  it("uses the token's program, so Token-2022 works too", async () => {
    const campusToken: Token = {
      mint: createReference(),
      decimals: 2,
      symbol: "UAL",
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    };
    const instructions = await buildPaymentInstructions({
      request: { ...requestFor(campusToken), amount: 120n },
      payer,
      token: campusToken,
    });
    const [create, transfer] = instructions;

    expect(transfer?.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    expect(create?.accounts?.map((a) => a.address)).toContain(
      TOKEN_2022_PROGRAM_ADDRESS,
    );
    expect(transfer?.accounts?.[2]?.address).toBe(
      await getAssociatedTokenAddress(recipient, campusToken),
    );

    const data = getTransferCheckedInstructionDataDecoder().decode(
      transfer.data!,
    );
    expect(data.amount).toBe(120n);
    expect(data.decimals).toBe(2);
  });

  it("rejects a request for another token", async () => {
    await expect(
      buildPaymentInstructions({
        request: { ...requestFor(EURC), splToken: createReference() },
        payer,
        token: EURC,
      }),
    ).rejects.toThrow("Can't pay with this token");
  });
});

describe("buildPaymentTransaction", () => {
  const lifetime = {
    blockhash: blockhash("EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N"),
    lastValidBlockHeight: 1_000n,
  };

  async function build(request = requestFor(EURC)) {
    return buildPaymentTransaction({
      request,
      payer: payer.address,
      token: EURC,
      lifetime,
    });
  }

  it("is a v0 transaction paid by the payer, unsigned, with the payment's instructions", async () => {
    const request = requestFor(EURC);
    const transaction = await build(request);
    const message = getCompiledTransactionMessageDecoder().decode(
      transaction.messageBytes,
    );

    if (message.version !== 0) throw new Error("Not a v0 transaction");
    expect(message.staticAccounts[0]).toBe(payer.address);
    expect(message.header.numSignerAccounts).toBe(1);
    expect(message.lifetimeToken).toBe(lifetime.blockhash);
    expect(message.instructions).toHaveLength(PAYMENT_TRANSFER_INDEX + 1);
    expect(
      message.staticAccounts[
        message.instructions[PAYMENT_TRANSFER_INDEX]?.programAddressIndex ?? -1
      ],
    ).toBe(TOKEN_PROGRAM_ADDRESS);
    expect(transaction.signatures).toEqual({ [payer.address]: null });
    expect(transaction.lifetimeConstraint).toEqual(lifetime);
  });

  it("always gives the same bytes for the same input", async () => {
    const request = requestFor(EURC);
    const [first, second] = await Promise.all([build(request), build(request)]);

    expect(second.messageBytes).toEqual(first.messageBytes);
  });

  it("survives encoding, as the API sends it", async () => {
    const transaction = await build();
    const decoded = getTransactionDecoder().decode(
      getTransactionEncoder().encode(transaction),
    );

    expect(decoded.messageBytes).toEqual(transaction.messageBytes);
  });

  it("changes with the charge", async () => {
    const request = requestFor(EURC);
    const [paid, other] = await Promise.all([
      build(request),
      build({ ...request, amount: request.amount + 1n }),
    ]);

    expect(other.messageBytes).not.toEqual(paid.messageBytes);
  });
});
