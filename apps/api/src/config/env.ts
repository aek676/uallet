import { ENV } from "varlock/env";

const config = {
  port: ENV.API_PORT,
  logLevel: ENV.LOG_LEVEL,
} as const;

export { config as ENV };
