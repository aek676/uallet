import {
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import {
  AccountRole,
  type Address,
  appendTransactionMessageInstructions,
  type BlockhashLifetimeConstraint,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  type Instruction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type TransactionSigner,
} from "@solana/kit";

import type { Token } from "./config";
import type { TransferRequest } from "./solana-pay";
import { getAssociatedTokenAddress } from "./token-account";

export interface PaymentInstructionsInput {
  request: TransferRequest;
  payer: TransactionSigner;
  token: Pick<Token, "mint" | "decimals" | "programAddress">;
}

/**
 * Instructions to pay a charge:
 *
 * 1. Create the recipient's token account if it doesn't exist (idempotent).
 * 2. `TransferChecked`, last, with the `reference` accounts appended as
 *    read-only so the merchant can find the transaction.
 */
export async function buildPaymentInstructions({
  request,
  payer,
  token,
}: PaymentInstructionsInput): Promise<Instruction[]> {
  if (request.splToken !== token.mint) {
    throw new Error(
      `Can't pay with this token: expected ${token.mint}, got ${request.splToken}`,
    );
  }

  const [source, destination] = await Promise.all([
    getAssociatedTokenAddress(payer.address, token),
    getAssociatedTokenAddress(request.recipient, token),
  ]);

  const createDestination = getCreateAssociatedTokenIdempotentInstruction({
    payer,
    ata: destination,
    owner: request.recipient,
    mint: token.mint,
    tokenProgram: token.programAddress,
  });

  const transfer = getTransferCheckedInstruction(
    {
      source,
      mint: token.mint,
      destination,
      authority: payer,
      amount: request.amount,
      decimals: token.decimals,
    },
    { programAddress: token.programAddress },
  );

  return [
    createDestination,
    {
      ...transfer,
      accounts: [
        ...transfer.accounts,
        ...request.reference.map((address) => ({
          address,
          role: AccountRole.READONLY,
        })),
      ],
    },
  ];
}

export const PAYMENT_TRANSFER_INDEX = 1;

export interface PaymentTransactionInput {
  request: TransferRequest;
  payer: Address;
  token: Pick<Token, "mint" | "decimals" | "programAddress">;
  lifetime: BlockhashLifetimeConstraint;
}

/**
 * The payment transaction, compiled and unsigned: v0 (Web3Auth's wallet
 * can't sign v1), the payer as fee payer and `buildPaymentInstructions`,
 * with no compute budget instructions.
 *
 * The API builds it for the wallet, and the wallet builds it again to check
 * what it signs: the same input always gives the same bytes. Any change here
 * reaches both, so deploy them together.
 */
export async function buildPaymentTransaction({
  request,
  payer,
  token,
  lifetime,
}: PaymentTransactionInput) {
  const instructions = await buildPaymentInstructions({
    request,
    payer: createNoopSigner(payer),
    token,
  });

  return compileTransaction(
    pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayer(payer, message),
      (message) =>
        setTransactionMessageLifetimeUsingBlockhash(lifetime, message),
      (message) => appendTransactionMessageInstructions(instructions, message),
    ),
  );
}

export type PaymentTransaction = Awaited<
  ReturnType<typeof buildPaymentTransaction>
>;
