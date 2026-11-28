// Loads and validates the env (`.env.schema`) before anything reads `ENV`.
// oxlint-disable-next-line import/no-unassigned-import
import "varlock/auto-load";
import { fetchEncodedAccount } from "@solana/kit";

import {
  getMerchantAttestationAddress,
  readMerchantAttestation,
} from "@repo/payments/merchant-registry";

import { parseAddressArgs } from "#/lib/args";
import { explorer, runCommand } from "#/lib/cli";
import { createReadOnlyRpc } from "#/lib/client";

const USAGE =
  "aube run --filter registry merchant:show -- --address <merchant address>";

/** What the wallet and the API will see for a merchant. Reads only. */
runCommand(USAGE, async () => {
  const { address } = parseAddressArgs(process.argv.slice(2));
  const attestation = await getMerchantAttestationAddress(address);
  const registration = readMerchantAttestation(
    await fetchEncodedAccount(createReadOnlyRpc(), attestation),
    { merchant: address },
  );

  console.log(
    registration.registered
      ? `Registered as "${registration.name}"${
          registration.expiresAt
            ? `, until ${registration.expiresAt.toISOString()}`
            : ""
        }.`
      : `Not a registered merchant (${registration.reason}).`,
  );
  console.log(`Attestation: ${attestation}  ${explorer(attestation)}`);
});
