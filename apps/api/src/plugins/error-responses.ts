import { Elysia } from "elysia";

export const errorResponses = new Elysia({ name: "error-responses" }).onError(
  { as: "scoped" },
  ({ code, error, status }) => {
    if (code === "PARSE" || (code === "VALIDATION" && error.type === "body")) {
      return status(400, { error: "invalid_body" as const });
    }
    return undefined;
  },
);
