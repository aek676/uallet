import { describe, expect, it } from "vitest";

import { app } from "#/app";

/** Elysia types a route's hooks as `any`: read them as `unknown`. */
function responseSchema(hooks: unknown): unknown {
  return typeof hooks === "object" && hooks !== null && "response" in hooks
    ? hooks.response
    : undefined;
}

// The response schema types the route for its clients and validates what it
// sends. Lint can't require it; this test can.
describe("every route", () => {
  it.each(app.routes.map((route) => [`${route.method} ${route.path}`, route]))(
    "%s declares a response schema",
    (_name, route) => {
      expect(responseSchema(route.hooks)).toBeDefined();
    },
  );
});
