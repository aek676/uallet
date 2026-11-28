// oxlint-disable-next-line import/no-unassigned-import
import "varlock/auto-load";
import {
  findCredentialPda,
  findSchemaPda,
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  SchemaDataType,
} from "@solana/attestation";
import { fetchEncodedAccounts, type Instruction } from "@solana/kit";

import {
  MERCHANT_CREDENTIAL_NAME,
  MERCHANT_SCHEMA_NAME,
  MERCHANT_SCHEMA_VERSION,
} from "@repo/payments/config";

import { explorer, runCommand } from "#/lib/cli";
import { createAuthorityClient } from "#/lib/client";

const USAGE = "aube run --filter registry registry:init";

runCommand(USAGE, async () => {
  const client = await createAuthorityClient();
  const authority = client.identity;

  const [credential] = await findCredentialPda({
    authority: authority.address,
    name: MERCHANT_CREDENTIAL_NAME,
  });
  const [schema] = await findSchemaPda({
    credential,
    name: MERCHANT_SCHEMA_NAME,
    version: MERCHANT_SCHEMA_VERSION,
  });

  const [credentialAccount, schemaAccount] = await fetchEncodedAccounts(
    client.rpc,
    [credential, schema],
  );

  const instructions: Instruction[] = [];
  if (credentialAccount?.exists !== true) {
    instructions.push(
      getCreateCredentialInstruction({
        payer: client.payer,
        credential,
        authority,
        name: MERCHANT_CREDENTIAL_NAME,
        signers: [authority.address],
      }),
    );
  }
  if (schemaAccount?.exists !== true) {
    instructions.push(
      getCreateSchemaInstruction({
        payer: client.payer,
        authority,
        credential,
        schema,
        name: MERCHANT_SCHEMA_NAME,
        description: "A campus merchant registered by the university",
        layout: [SchemaDataType.String],
        fieldNames: ["name"],
      }),
    );
  }

  if (instructions.length === 0) {
    console.log("The credential and the schema already exist.");
  } else {
    const result = await client.sendTransaction(instructions);
    console.log(`Created: ${result.context.signature}`);
  }

  console.log(`
                Credential: ${credential}  ${explorer(credential)}
                Schema:     ${schema}  ${explorer(schema)}

                MERCHANT_REGISTRY in packages/payments/src/config.ts:

                  authority: address("${authority.address}"),
                  credential: address("${credential}"),
                  schema: address("${schema}"),
  `);
});
