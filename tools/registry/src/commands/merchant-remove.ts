// Loads and validates the env (`.env.schema`) before anything reads `ENV`.
// oxlint-disable-next-line import/no-unassigned-import
import "varlock/auto-load";
import { fetchEncodedAccount } from "@solana/kit";

import {
  getMerchantAttestationAddress,
  planMerchantRemoval,
} from "@repo/payments/merchant-registry";

import { parseAddressArgs } from "#/lib/args";
import { runCommand } from "#/lib/cli";
import { createAuthorityClient } from "#/lib/client";
import { getRegistryFor } from "#/lib/registry";

const USAGE =
  "aube run --filter registry merchant:remove -- --address <merchant address>";

/**
 * Removes a merchant (`planMerchantRemoval`): closes its attestation, and the
 * rent goes back to the authority. Its token account and balance stay.
 */
runCommand(USAGE, async () => {
  const { address } = parseAddressArgs(process.argv.slice(2));
  const client = await createAuthorityClient();
  const registry = await getRegistryFor(client);

  const attestation = await getMerchantAttestationAddress(address, registry);
  const plan = await planMerchantRemoval({
    merchant: address,
    authority: client.identity,
    payer: client.payer,
    attestationAccount: await fetchEncodedAccount(client.rpc, attestation),
    registry,
  });

  if (plan.instructions.length === 0) {
    console.log("Not registered: nothing to remove.");
    return;
  }
  const result = await client.sendTransaction(plan.instructions);
  console.log(`Removed: ${result.context.signature}`);
});
