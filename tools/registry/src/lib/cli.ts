import { UsageError } from "#/lib/args";

/** An expected failure: printed without a stack trace. */
export class CommandError extends Error {
  override name = "CommandError";
}

/**
 * Runs a command: usage errors exit 2, anything else 1. Expected failures
 * print only their message.
 */
export function runCommand(usage: string, command: () => Promise<void>): void {
  command().then(
    () => process.exit(0),
    (error: unknown) => {
      if (error instanceof UsageError) {
        console.error(`${error.message}\n\nUsage: ${usage}`);
        process.exit(2);
      }
      console.error(error instanceof CommandError ? error.message : error);
      process.exit(1);
    },
  );
}

export const explorer = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=devnet`;
