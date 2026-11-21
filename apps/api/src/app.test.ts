import { describe, expect, it } from "vitest";

import { app } from "#/app";

describe("GET /health", () => {
  it("returns ok", async () => {
    const response = await app.handle(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
