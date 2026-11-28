import { fetchEncodedAccount } from "@solana/kit";

import { MERCHANT_REGISTRY } from "@repo/payments/config";

import { CommandError } from "#/lib/cli";
import type { AuthorityClient } from "#/lib/client";

/**
 * The registry from `@repo/payments/config`, once checked that this client's
 * keypair is its authority and that it exists on the RPC's cluster.
 */
export async function getRegistryFor(client: AuthorityClient) {
  const registry = MERCHANT_REGISTRY;
  if (client.identity.address !== registry.authority) {
    throw new CommandError(
      `REGISTRY_AUTHORITY_KEYPAIR is ${client.identity.address}, but the registry's authority is ${registry.authority} (MERCHANT_REGISTRY in @repo/payments/config). Run registry:init first, or use the right keypair.`,
    );
  }
  const credential = await fetchEncodedAccount(client.rpc, registry.credential);
  if (!credential.exists) {
    throw new CommandError(
      `The registry's credential ${registry.credential} doesn't exist on this cluster. Run registry:init first.`,
    );
  }
  return registry;
}
