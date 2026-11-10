import type { Address, Signature } from "@solana/kit";

import type { TransferRequest } from "@repo/payments/solana-pay";

type SignatureInfo = { signature: Signature; err: unknown };

/** The RPC call we need: `getSignaturesForAddress`, or a fake in tests. */
export type FindSignatures = (
  reference: Address,
  abortSignal: AbortSignal,
) => Promise<readonly SignatureInfo[]>;

/**
 * A successful transaction that already mentions the charge's reference: the
 * charge looks paid. `null` if there is none.
 *
 * It only reads, so a failed request rejects and the caller decides: it's a
 * best-effort check, not a guarantee (two payments sent at once both pass).
 */
export async function findEarlierPayment(
  request: Pick<TransferRequest, "reference">,
  findSignatures: FindSignatures,
  abortSignal: AbortSignal,
): Promise<Signature | null> {
  const [reference] = request.reference;
  // Without a reference there is no way to tell one charge from another.
  if (reference === undefined) return null;

  const found = await findSignatures(reference, abortSignal);
  return found.find(({ err }) => err === null)?.signature ?? null;
}
