import { base64url } from "jose";
import { ENV } from "varlock/env";

const config = {
  port: ENV.API_PORT,
  logLevel: ENV.LOG_LEVEL,
  sessionKey: base64url.decode(ENV.API_SESSION_KEY),
  web3Auth: {
    clientId: ENV.WEB3AUTH_CLIENT_ID,
    jwksUrl: ENV.WEB3AUTH_JWKS_URL,
    issuer: ENV.WEB3AUTH_ISSUER,
  },
} as const;

export { config as ENV };
