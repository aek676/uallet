import { t, type UnwrapSchema } from "elysia";

function errorResponse<const Codes extends [string, ...string[]]>(
  codes: Codes,
) {
  return t.Object({ error: t.UnionEnum(codes) });
}

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
