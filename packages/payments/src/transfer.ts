import {
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import {
  AccountRole,
  type Instruction,
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
 * Instructions to pay a Solana Pay transfer request:
 *
 * 1. Create the recipient's token account if it doesn't exist (idempotent).
 * 2. `TransferChecked`, last as the spec requires, with the `reference`
 *    accounts appended as read-only so the merchant can find the transaction.
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
  // The spec requires a memo instruction when the request has one. Our
  // merchant app never sets it, and we don't want to silently drop it.
  if (request.memo !== undefined) {
    throw new Error("Payment requests with a memo are not supported");
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
