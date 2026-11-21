import { describe, expect, it } from "vitest";

import { health } from "#/routes/health/index";

describe("GET /health", () => {
  it("returns ok", async () => {
    const response = await health.handle(
      new Request("http://localhost/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ status: "ok" });
  });
});
