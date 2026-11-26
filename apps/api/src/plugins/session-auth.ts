import { Elysia } from "elysia";

import { bearerToken } from "#/lib/bearer";
import type { SessionTokens } from "#/lib/session-token";

export function sessionAuth(sessions: SessionTokens) {
  return new Elysia().macro({
    auth: {
      async resolve({ headers, status }) {
        const token = bearerToken(headers["authorization"]);
        const address =
          token === undefined ? undefined : await sessions.verify(token);
        if (address === undefined) {
          return status(401, { error: "invalid_session" as const });
        }
        return { address };
      },
    },
  });
}

export type SessionAuth = ReturnType<typeof sessionAuth>;
