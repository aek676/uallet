import { homedir } from "node:os";
import { join } from "node:path";

import { ENV } from "varlock/env";

/** `~` and `~/…` are the user's home, as in a shell. */
export function expandHome(path: string, home = homedir()): string {
  if (path === "~") return home;
  if (path.startsWith("~/")) return join(home, path.slice(2));
  return path;
}

const config = {
  solanaRpcUrl: ENV.SOLANA_RPC_URL,
  authorityKeypairPath: expandHome(ENV.REGISTRY_AUTHORITY_KEYPAIR),
} as const;

export { config as ENV };
