import {
  isTransactionModifyingSigner,
  type TransactionSigner,
} from "@solana/kit";

export interface SignListener {
  onStart(): void;
  /** Also when signing fails. */
  onEnd(): void;
}

/**
 * `signer`, reporting when it starts and finishes signing. It times signers
 * that sign through `modifyAndSignTransactions`, as the Web3Auth wallet does.
 * Any other signer is returned as is, untimed.
 */
export function withSignTiming(
  signer: TransactionSigner,
  listener: SignListener,
): TransactionSigner {
  if (!isTransactionModifyingSigner(signer)) return signer;

  const modifyAndSignTransactions: typeof signer.modifyAndSignTransactions =
    async (transactions, config) => {
      listener.onStart();
      try {
        return await signer.modifyAndSignTransactions(transactions, config);
      } finally {
        listener.onEnd();
      }
    };

  return { ...signer, modifyAndSignTransactions };
}
