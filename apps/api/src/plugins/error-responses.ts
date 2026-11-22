import { Elysia, t } from "elysia";

export function errorResponse<const Codes extends [string, ...string[]]>(
  codes: Codes,
) {
  return t.Object({ error: t.UnionEnum(codes) });
}

export const errorResponses = new Elysia({ name: "error-responses" }).onError(
  { as: "scoped" },
  ({ code, error, status }) => {
    if (code === "PARSE" || (code === "VALIDATION" && error.type === "body")) {
      return status(400, { error: "invalid_body" as const });
    }
    if (code === "VALIDATION" && error.type === "query") {
      return status(400, { error: "invalid_query" as const });
    }
    return undefined;
  },
);
