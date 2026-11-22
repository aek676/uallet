import { isAddress } from "@solana/kit";
import { Elysia } from "elysia";

import { bearerToken } from "#/lib/bearer";
import type { SessionTokens } from "#/lib/session-token";
import { errorResponses } from "#/plugins/error-responses";
import { requestLogging } from "#/plugins/request-logging";
import type { SessionAuth } from "#/plugins/session-auth";
import { AuthModel } from "#/routes/auth/model";
import type { VerifyIdToken } from "#/routes/auth/service";

export type AuthRoutesDeps = {
  verifyIdToken: VerifyIdToken;
  sessions: SessionTokens;
  sessionAuth: SessionAuth;
};

export function authRoutes({
  verifyIdToken,
  sessions,
  sessionAuth,
}: AuthRoutesDeps) {
  return new Elysia({ prefix: "/auth" })
    .use(requestLogging)
    .use(errorResponses)
    .use(sessionAuth)
    .post(
      "/session",
      async ({ body, headers, log, status }) => {
        if (!isAddress(body.address)) {
          return status(400, { error: "invalid_body" as const });
        }

        const idToken = bearerToken(headers["authorization"]);
        if (idToken === undefined) {
          return status(401, { error: "invalid_token" as const });
        }

        const result = await verifyIdToken(idToken, body.address);
        if (!result.ok) {
          return status(401, { error: result.error });
        }

        const session = await sessions.sign(result.address);
        log.info(
          { address: result.address, walletType: result.walletType },
          "Session created",
        );
        return {
          token: session.token,
          expiresAt: session.expiresAt.toISOString(),
        };
      },
      {
        body: AuthModel.sessionBody,
        response: {
          200: AuthModel.sessionResponse,
          400: AuthModel.sessionInvalid,
          401: AuthModel.sessionUnauthorized,
        },
      },
    )
    .get("/me", ({ address }) => ({ address }), {
      auth: true,
      response: {
        200: AuthModel.meResponse,
        401: AuthModel.meUnauthorized,
      },
    });
}
