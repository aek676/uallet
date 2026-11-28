import { createClient, createSolanaRpc } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { signerFromFile } from "@solana/kit-plugin-signer";

import { ENV } from "#/config/env";

export function createReadOnlyRpc() {
  return createSolanaRpc(ENV.solanaRpcUrl);
}

export async function createAuthorityClient() {
  return createClient()
    .use(signerFromFile(ENV.authorityKeypairPath))
    .use(
      solanaRpc({
        rpcUrl: ENV.solanaRpcUrl,
        transactionConfig: { version: 0 },
      }),
    );
}

export type AuthorityClient = Awaited<ReturnType<typeof createAuthorityClient>>;
