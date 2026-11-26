import { address, type Address } from "@solana/kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Fetcher } from "#/lib/api-client";
import {
  ApiSessionError,
  createApiSessions,
  SESSION_REFRESH_MARGIN_MS,
  type ApiSessionParams,
} from "#/lib/api-session";

const BASE_URL = "https://api.test/api";
const A = address("11111111111111111111111111111111");
const B = address("SysvarRent111111111111111111111111111111111");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sessionBody(token: string, expiresAt: number) {
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

function paramsFor(user: Address, idToken = `id-${user}`) {
  return {
    address: user,
    web3Auth: { getAuthTokenInfo: () => Promise.resolve({ idToken }) },
  } satisfies ApiSessionParams;
}

/** The clock at the start of every test (`vi.setSystemTime`). */
const START = 1_000_000;

beforeEach(() => {
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

function setup(handler: (request: Request) => Response | Promise<Response>) {
  const requests: Request[] = [];
  const fetch = vi.fn<Fetcher>((input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return Promise.resolve(handler(request));
  });
  vi.stubGlobal("fetch", fetch);
  return { ...createApiSessions(BASE_URL), fetch, requests };
}

describe("getApiSession", () => {
  it("opens a session with the identity token", async () => {
    const t = setup(() => json(sessionBody("tok-1", START + 600_000)));
    const session = await t.getApiSession(paramsFor(A, "my-id-token"));

    expect(session).toEqual({ token: "tok-1", expiresAt: 1_600_000 });
    const [request] = t.requests;
    expect(request?.url).toBe("https://api.test/api/auth/session");
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("authorization")).toBe("Bearer my-id-token");
    expect(await request?.json()).toEqual({ address: A });
  });

  it("reuses the cached session", async () => {
    const t = setup(() => json(sessionBody("tok", START + 600_000)));
    const first = await t.getApiSession(paramsFor(A));
    advance(60_000);
    expect(await t.getApiSession(paramsFor(A))).toBe(first);
    expect(t.fetch).toHaveBeenCalledTimes(1);
  });

  it("replaces a session inside the refresh margin", async () => {
    let n = 0;
    const t = setup(() =>
      json(sessionBody(`tok-${++n}`, Date.now() + 600_000)),
    );
    await t.getApiSession(paramsFor(A));
    advance(600_000 - SESSION_REFRESH_MARGIN_MS - 1);
    expect((await t.getApiSession(paramsFor(A))).token).toBe("tok-1");
    advance(1);
    expect((await t.getApiSession(paramsFor(A))).token).toBe("tok-2");
  });

  it("keeps one session per address", async () => {
    const t = setup((request) =>
      json(
        sessionBody(`tok-${request.headers.get("authorization")}`, 2_000_000),
      ),
    );
    expect((await t.getApiSession(paramsFor(A))).token).toBe(
      `tok-Bearer id-${A}`,
    );
    expect((await t.getApiSession(paramsFor(B))).token).toBe(
      `tok-Bearer id-${B}`,
    );
    expect(t.fetch).toHaveBeenCalledTimes(2);
  });

  it("shares one request between concurrent calls", async () => {
    const t = setup(() => json(sessionBody("tok", 2_000_000)));
    const [a, b] = await Promise.all([
      t.getApiSession(paramsFor(A)),
      t.getApiSession(paramsFor(A)),
    ]);
    expect(a).toBe(b);
    expect(t.fetch).toHaveBeenCalledTimes(1);
  });

  it("doesn't cache a failure", async () => {
    let fail = true;
    const t = setup(() =>
      fail
        ? json({ error: "invalid_token" }, 401)
        : json(sessionBody("tok", 2_000_000)),
    );
    await expect(t.getApiSession(paramsFor(A))).rejects.toBeInstanceOf(
      ApiSessionError,
    );
    fail = false;
    expect((await t.getApiSession(paramsFor(A))).token).toBe("tok");
  });

  it("exposes the API's status and error code", async () => {
    const t = setup(() => json({ error: "address_mismatch" }, 401));
    await expect(t.getApiSession(paramsFor(A))).rejects.toMatchObject({
      name: "ApiSessionError",
      status: 401,
      code: "address_mismatch",
    });
  });

  it("rejects on a non-JSON error body, without a code", async () => {
    const t = setup(() => new Response("Bad Gateway", { status: 502 }));
    const error = await t.getApiSession(paramsFor(A)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiSessionError);
    expect(error).toMatchObject({ status: 502, code: undefined });
  });

  it("rejects on an unexpected response", async () => {
    const t = setup(() => json({ token: "", expiresAt: "soon" }));
    await expect(t.getApiSession(paramsFor(A))).rejects.toMatchObject({
      name: "ApiSessionError",
      status: 200,
    });
  });

  it("rejects when the request fails, and doesn't cache it", async () => {
    let down = true;
    const cause = new TypeError("network down");
    const t = setup(() => {
      if (down) throw cause;
      return json(sessionBody("tok", 2_000_000));
    });
    const error = await t.getApiSession(paramsFor(A)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiSessionError);
    expect(error).toMatchObject({ status: undefined, code: undefined });
    down = false;
    expect((await t.getApiSession(paramsFor(A))).token).toBe("tok");
  });

  it("ignores an error code the route doesn't declare", async () => {
    const t = setup(() => json({ error: "rate_limited" }, 429));
    await expect(t.getApiSession(paramsFor(A))).rejects.toMatchObject({
      name: "ApiSessionError",
      status: 429,
      code: undefined,
    });
  });

  it("wraps a failure to get the identity token", async () => {
    const t = setup(() => json(sessionBody("tok", 2_000_000)));
    const cause = new Error("Not connected with wallet");
    const error = await t
      .getApiSession({
        address: A,
        web3Auth: { getAuthTokenInfo: () => Promise.reject(cause) },
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiSessionError);
    expect(error).toMatchObject({ cause });
    expect(t.fetch).not.toHaveBeenCalled();
  });

  it("wraps a body that isn't the JSON it claims to be", async () => {
    const t = setup(
      () =>
        new Response("<html>Bad Gateway</html>", {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
    );
    const error = await t.getApiSession(paramsFor(A)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiSessionError);
    expect(error instanceof Error && error.cause).toBeInstanceOf(SyntaxError);
  });
});

function apiSetup(
  onMe: (request: Request, n: number) => Response | Promise<Response>,
) {
  let sessions = 0;
  let calls = 0;
  const t = setup((request) => {
    if (new URL(request.url).pathname.endsWith("/auth/session")) {
      return json(sessionBody(`tok-${++sessions}`, Date.now() + 600_000));
    }
    return onMe(request, ++calls);
  });
  return t;
}

function requestsTo(t: { requests: Request[] }, path: string) {
  return t.requests.filter((r) => r.url.endsWith(path));
}

describe("apiClient", () => {
  it("sends the session as bearer and types the response", async () => {
    const t = apiSetup(() => json({ address: A }));
    const { data, error } = await t.apiClient(paramsFor(A)).auth.me.get();

    expect(error).toBeNull();
    expect(data?.address).toBe(A);
    const me = t.requests.at(-1);
    expect(me?.url).toBe("https://api.test/api/auth/me");
    expect(me?.headers.get("authorization")).toBe("Bearer tok-1");
  });

  it("returns typed errors as values", async () => {
    const t = apiSetup(() => json({ error: "invalid_session" }, 403));
    const { error } = await t.apiClient(paramsFor(A)).auth.me.get();
    expect(error?.status).toBe(403);
  });

  it("opens a new session and retries once on a 401", async () => {
    const t = apiSetup((request, n) =>
      n === 1 && request.headers.get("authorization") === "Bearer tok-1"
        ? json({ error: "invalid_session" }, 401)
        : json({ address: A }),
    );
    const { data } = await t.apiClient(paramsFor(A)).auth.me.get();

    expect(data?.address).toBe(A);
    const tokens = t.requests
      .filter((r) => r.url.endsWith("/auth/me"))
      .map((r) => r.headers.get("authorization"));
    expect(tokens).toEqual(["Bearer tok-1", "Bearer tok-2"]);
  });

  it("retries only once", async () => {
    const t = apiSetup(() => json({ error: "invalid_session" }, 401));
    const { error } = await t.apiClient(paramsFor(A)).auth.me.get();
    expect(error?.status).toBe(401);
    expect(t.requests.filter((r) => r.url.endsWith("/auth/me"))).toHaveLength(
      2,
    );
  });

  it("keeps a newer session when a stale token is refused", async () => {
    const { promise: held, resolve: release } =
      Promise.withResolvers<Response>();
    const t = apiSetup((request) =>
      request.headers.get("authorization") === "Bearer tok-1"
        ? held
        : json({ address: A }),
    );
    const client = t.apiClient(paramsFor(A));

    const stale = client.auth.me.get();
    await vi.waitFor(() => expect(requestsTo(t, "/auth/me")).toHaveLength(1));
    // tok-1 expires while its request is in flight: someone else gets tok-2.
    advance(600_000);
    expect((await t.getApiSession(paramsFor(A))).token).toBe("tok-2");
    release(json({ error: "invalid_session" }, 401));

    expect((await stale).data?.address).toBe(A);
    expect(
      requestsTo(t, "/auth/me").map((r) => r.headers.get("authorization")),
    ).toEqual(["Bearer tok-1", "Bearer tok-2"]);
    expect(requestsTo(t, "/auth/session")).toHaveLength(2);
  });

  it("shares the new session between concurrent 401s", async () => {
    const t = apiSetup((request) =>
      request.headers.get("authorization") === "Bearer tok-1"
        ? json({ error: "invalid_session" }, 401)
        : json({ address: A }),
    );
    const client = t.apiClient(paramsFor(A));

    const results = await Promise.all([
      client.auth.me.get(),
      client.auth.me.get(),
      client.auth.me.get(),
    ]);

    expect(results.map((r) => r.data?.address)).toEqual([A, A, A]);
    expect(requestsTo(t, "/auth/session")).toHaveLength(2);
  });

  it("reports a session that can't be opened as the error's value", async () => {
    const t = setup(() => json({ error: "invalid_token" }, 401));
    const { data, error, response } = await t
      .apiClient(paramsFor(A))
      .auth.me.get();

    expect(data).toBeNull();
    expect(response).toBeUndefined();
    expect(error?.value).toBeInstanceOf(ApiSessionError);
    expect(error?.value).toMatchObject({ status: 401, code: "invalid_token" });
    expect(requestsTo(t, "/auth/me")).toHaveLength(0);
  });
});
