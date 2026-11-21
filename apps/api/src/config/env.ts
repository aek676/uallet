import { ENV } from "varlock/env";

const config = {
  /** Port the API listens on (5177). */
  port: ENV.API_PORT,
} as const;

export { config as ENV };
