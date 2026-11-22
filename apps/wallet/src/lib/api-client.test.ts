import { describe, expect, it, vi } from "vitest";

import {
  createApiClient,
  resolveApiBaseUrl,
  type Fetcher,
} from "#/lib/api-client";

describe("resolveApiBaseUrl", () => {
  it("resolves a relative path against the origin, keeping the prefix", () => {
    expect(resolveApiBaseUrl("/api", "https://wallet.test")).toBe(
      "https://wallet.test/api",
    );
  });

  it("keeps an absolute URL and drops the trailing slash", () => {
    expect(resolveApiBaseUrl("http://localhost:5177/", "https://x.test")).toBe(
      "http://localhost:5177",
    );
    expect(resolveApiBaseUrl("https://api.test/v1/", undefined)).toBe(
      "https://api.test/v1",
    );
  });

  it("needs an origin for a relative path", () => {
    expect(() => resolveApiBaseUrl("/api", undefined)).toThrow("Invalid URL");
  });
});

describe("createApiClient", () => {
  it("leaves date-like strings alone", async () => {
    const expiresAt = "2030-01-01T00:00:00.000Z";
    const fetcher = vi.fn<Fetcher>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ token: "t", expiresAt }), {
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const api = createApiClient({ baseUrl: "https://api.test", fetcher });
    const { data } = await api.auth.session.post({ address: "a" });
    expect(data?.expiresAt).toBe(expiresAt);
  });
});
