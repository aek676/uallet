import { Elysia } from "elysia";
import { createRemoteJWKSet } from "jose";

import { PAYMENT_TOKEN } from "@repo/payments/config";

import { ENV } from "#/config/env";
import { createSessionTokens } from "#/lib/session-token";
import { createLatestBlockhashSource } from "#/lib/solana-rpc";
import { requestLogging } from "#/plugins/request-logging";
import { sessionAuth as createSessionAuth } from "#/plugins/session-auth";
import { authRoutes } from "#/routes/auth/index";
import { createIdTokenVerifier } from "#/routes/auth/service";
import { health } from "#/routes/health/index";
import { payRoutes } from "#/routes/pay/index";
import { createPaymentBuilder } from "#/routes/pay/service";

const sessions = createSessionTokens({ key: ENV.sessionKey });
const sessionAuth = createSessionAuth(sessions);

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
      sessionAuth,
    }),
  )
  .use(
    payRoutes({
      buildPayment: createPaymentBuilder({
        getLatestBlockhash: createLatestBlockhashSource(ENV.solanaRpcUrl),
        token: PAYMENT_TOKEN,
      }),
      sessionAuth,
    }),
  );

export type App = typeof app;
