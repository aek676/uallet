/**
 * Environment variables, loaded and validated by Varlock when the server
 * starts (see `.env.schema`). `src/index.ts` imports `varlock/auto-load`
 * first, so a missing or invalid value stops the server before it listens.
 *
 * Keep the import named `ENV`, as in the apps.
 */
import { ENV } from "varlock/env";

const config = {
  /** Port the API listens on (5177). */
  port: ENV.API_PORT,
} as const;

export { config as ENV };
