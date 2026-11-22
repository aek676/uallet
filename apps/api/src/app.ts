import { Elysia } from "elysia";
import { createRemoteJWKSet } from "jose";

import { ENV } from "#/config/env";
import { createSessionTokens } from "#/lib/session-token";
import { requestLogging } from "#/plugins/request-logging";
import { sessionAuth } from "#/plugins/session-auth";
import { authRoutes } from "#/routes/auth/index";
import { createIdTokenVerifier } from "#/routes/auth/service";
import { health } from "#/routes/health/index";

const sessions = createSessionTokens({ key: ENV.sessionKey });

export const app = new Elysia()
  .use(requestLogging)
  .use(health)
  .use(
    authRoutes({
      verifyIdToken: createIdTokenVerifier({
        jwks: createRemoteJWKSet(new URL(ENV.web3Auth.jwksUrl)),
        audience: ENV.web3Auth.clientId,
        issuer: ENV.web3Auth.issuer,
      }),
      sessions,
      sessionAuth: sessionAuth(sessions),
    }),
  );

export type App = typeof app;
