import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import { type Address, isAddress } from "@solana/kit";

import {
  isValidMerchantName,
  MERCHANT_NAME_MAX_LENGTH,
} from "@repo/payments/merchant-registry";

/** Wrong command-line arguments: print the message and the usage. */
export class UsageError extends Error {
  override name = "UsageError";
}

function parse<T extends ParseArgsOptionsConfig>(argv: string[], options: T) {
  try {
    return parseArgs({ args: argv, options, strict: true }).values;
  } catch (error) {
    throw new UsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

function parseMerchantAddress(value: string | undefined): Address {
  if (value === undefined) throw new UsageError("Missing --address");
  if (!isAddress(value)) {
    throw new UsageError(`Not a Solana address: "${value}"`);
  }
  return value;
}

/** `--address <merchant>`. */
export function parseAddressArgs(argv: string[]): { address: Address } {
  const values = parse(argv, { address: { type: "string" } });
  return { address: parseMerchantAddress(values.address) };
}

/** `--address <merchant> --name <name>`. */
export function parseAddArgs(argv: string[]): {
  address: Address;
  name: string;
} {
  const values = parse(argv, {
    address: { type: "string" },
    name: { type: "string" },
  });
  const address = parseMerchantAddress(values.address);
  // NFC, so the same name typed on any system is the same bytes on-chain.
  const name = values.name?.trim().normalize("NFC");
  if (name === undefined || name === "") throw new UsageError("Missing --name");
  if (!isValidMerchantName(name)) {
    throw new UsageError(
      `Invalid name: 1 to ${MERCHANT_NAME_MAX_LENGTH} characters, no control or invisible characters`,
    );
  }
  return { address, name };
}
