import { t, type UnwrapSchema } from "elysia";

import { errorResponse } from "#/plugins/error-responses";

export const PayModel = {
  payQuery: t.Object({
    recipient: t.String(),
    amount: t.String(),
    "spl-token": t.String(),
    reference: t.Array(t.String(), { minItems: 1 }),
    label: t.Optional(t.String()),
    message: t.Optional(t.String()),
  }),
  payBody: t.Object({ account: t.String() }),
  payResponse: t.Object({ transaction: t.String() }),
  payInvalid: errorResponse([
    "invalid_body",
    "invalid_query",
    "invalid_charge",
  ]),
  payUnauthorized: errorResponse(["invalid_session"]),
  payForbidden: errorResponse(["account_mismatch"]),
  payUnavailable: errorResponse(["rpc_unavailable"]),
};

export type PayModel = {
  [k in keyof typeof PayModel]: UnwrapSchema<(typeof PayModel)[k]>;
};
