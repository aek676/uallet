import { t, type UnwrapSchema } from "elysia";

import { errorResponse } from "#/plugins/error-responses";

export const AuthModel = {
  sessionBody: t.Object({ address: t.String() }),
  sessionResponse: t.Object({ token: t.String(), expiresAt: t.String() }),
  sessionInvalid: errorResponse(["invalid_body"]),
  sessionUnauthorized: errorResponse([
    "invalid_token",
    "address_mismatch",
    "no_solana_key",
  ]),

  meResponse: t.Object({ address: t.String() }),
  meUnauthorized: errorResponse(["invalid_session"]),
};

export type AuthModel = {
  [k in keyof typeof AuthModel]: UnwrapSchema<(typeof AuthModel)[k]>;
};
