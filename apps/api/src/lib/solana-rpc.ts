import { type BlockhashLifetimeConstraint, createSolanaRpc } from "@solana/kit";

const RPC_TIMEOUT_MS = 5_000;

export type GetLatestBlockhash = () => Promise<BlockhashLifetimeConstraint>;

export function createLatestBlockhashSource(
  rpcUrl: string,
): GetLatestBlockhash {
  const rpc = createSolanaRpc(rpcUrl);
  return async () => {
    const { value } = await rpc
      .getLatestBlockhash({ commitment: "confirmed" })
      .send({ abortSignal: AbortSignal.timeout(RPC_TIMEOUT_MS) });
    return value;
  };
}
