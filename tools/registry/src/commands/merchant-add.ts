// Loads and validates the env (`.env.schema`) before anything reads `ENV`.
// oxlint-disable-next-line import/no-unassigned-import
import "varlock/auto-load";
import { fetchEncodedAccount } from "@solana/kit";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import {
  getMerchantAttestationAddress,
  planMerchantRegistration,
} from "@repo/payments/merchant-registry";
import { getAssociatedTokenAddress } from "@repo/payments/token-account";

import { parseAddArgs } from "#/lib/args";
import { explorer, runCommand } from "#/lib/cli";
import { createAuthorityClient } from "#/lib/client";
import { getRegistryFor } from "#/lib/registry";

const USAGE =
  'aube run --filter registry merchant:add -- --address <merchant address> --name "<name>"';

/**
 * Registers a merchant, or renames it, and creates its token account for
 * `PAYMENT_TOKEN` if missing (`planMerchantRegistration`). Running it again
 * with the same name changes nothing.
 */
runCommand(USAGE, async () => {
  const { address, name } = parseAddArgs(process.argv.slice(2));
  const client = await createAuthorityClient();
  const registry = await getRegistryFor(client);

  const [attestationAccount, tokenAccount] = await Promise.all([
    getMerchantAttestationAddress(address, registry).then((attestation) =>
      fetchEncodedAccount(client.rpc, attestation),
    ),
    getAssociatedTokenAddress(address, PAYMENT_TOKEN).then((ata) =>
      fetchEncodedAccount(client.rpc, ata),
    ),
  ]);

  const plan = await planMerchantRegistration({
    merchant: address,
    name,
    authority: client.identity,
    payer: client.payer,
    attestationAccount,
    tokenAccount,
    registry,
  });

  if (plan.instructions.length === 0) {
    console.log(`Already registered as "${name}", with its token account.`);
  } else {
    const result = await client.sendTransaction(plan.instructions);
    console.log(`Registered as "${name}": ${result.context.signature}`);
  }

  console.log(`
Attestation:   ${plan.attestation}  ${explorer(plan.attestation)}
Token account: ${plan.tokenAccount}  ${explorer(plan.tokenAccount)}`);
});
