import { type Address, getAddressDecoder } from "@solana/kit";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTPayload,
  SignJWT,
} from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { spyOnRequestLogs } from "#/lib/log-spy";
import { createSessionTokens } from "#/lib/session-token";
import { sessionAuth } from "#/plugins/session-auth";
import { authRoutes } from "#/routes/auth/index";
import { createIdTokenVerifier } from "#/routes/auth/service";

const CLIENT_ID = "test-client-id";
const ISSUER = "web3auth.io";
const KEY_ID = "test-key";

// Two Solana keys of the user, as Web3Auth puts them in `wallets`.
const APP_KEY_HEX = "11".repeat(32);
const THRESHOLD_KEY_HEX = "a2".repeat(32);
const APP_KEY_ADDRESS = solanaAddress(APP_KEY_HEX);
const THRESHOLD_KEY_ADDRESS = solanaAddress(THRESHOLD_KEY_HEX);
const OTHER_ADDRESS = solanaAddress("33".repeat(32));

const WALLETS = [
  { public_key: APP_KEY_HEX, type: "web3auth_app_key", curve: "ed25519" },
  {
    public_key: THRESHOLD_KEY_HEX,
    type: "web3auth_threshold_key",
    curve: "ed25519",
  },
  {
    public_key: `02${"44".repeat(32)}`,
    type: "web3auth_threshold_key",
    curve: "secp256k1",
  },
];

function solanaAddress(hex: string): Address {
  return getAddressDecoder().decode(Uint8Array.from(Buffer.from(hex, "hex")));
}

const signingKeys = await generateKeyPair("ES256", { extractable: true });
const otherKeys = await generateKeyPair("ES256");
const jwks = createLocalJWKSet({
  keys: [
    {
      ...(await exportJWK(signingKeys.publicKey)),
      kid: KEY_ID,
      alg: "ES256",
      use: "sig",
    },
  ],
});

/** The clock in every test (`vi.setSystemTime`). */
const NOW = new Date("2026-11-21T12:00:00Z");

let logs: ReturnType<typeof spyOnRequestLogs>;

beforeEach(() => {
  vi.setSystemTime(NOW);
  logs = spyOnRequestLogs();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function seconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

/** The feature as `src/app.ts` builds it, with a new session key each time. */
function makeApp() {
  const sessions = createSessionTokens({
    key: crypto.getRandomValues(new Uint8Array(32)),
  });
  return authRoutes({
    verifyIdToken: createIdTokenVerifier({
      jwks,
      audience: CLIENT_ID,
      issuer: ISSUER,
    }),
    sessions,
    sessionAuth: sessionAuth(sessions),
  });
}

type IdTokenOptions = {
  claims?: JWTPayload;
  issuer?: string;
  audience?: string;
  expiresAt?: Date;
  key?: CryptoKey;
};

function idToken({
  claims = { wallets: WALLETS },
  issuer = ISSUER,
  audience = CLIENT_ID,
  expiresAt = new Date(NOW.getTime() + 60 * 60 * 1000),
  key = signingKeys.privateKey,
}: IdTokenOptions = {}) {
  return new SignJWT({
    email: "student@ual.es",
    name: "A Student",
    ...claims,
  })
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(seconds(NOW) - 60)
    .setExpirationTime(seconds(expiresAt))
    .sign(key);
}

function postSession(
  app: ReturnType<typeof makeApp>,
  {
    authorization,
    body,
  }: { authorization?: string | undefined; body: unknown },
) {
  return app.handle(
    new Request("http://localhost/auth/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization === undefined ? {} : { authorization }),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function getMe(app: ReturnType<typeof makeApp>, authorization?: string) {
  return app.handle(
    new Request("http://localhost/auth/me", {
      headers: authorization === undefined ? {} : { authorization },
    }),
  );
}

const sessionSchema = z.strictObject({
  token: z.string().min(1),
  expiresAt: z.string(),
});

async function openSession(app: ReturnType<typeof makeApp>) {
  const response = await postSession(app, {
    authorization: `Bearer ${await idToken()}`,
    body: { address: APP_KEY_ADDRESS },
  });
  expect(response.status).toBe(200);
  return sessionSchema.parse(await response.json());
}

describe("POST /auth/session", () => {
  it.each([
    ["web3auth_app_key", APP_KEY_ADDRESS],
    ["web3auth_threshold_key", THRESHOLD_KEY_ADDRESS],
  ])("opens a session for the %s address", async (type, address) => {
    const app = makeApp();

    const response = await postSession(app, {
      authorization: `Bearer ${await idToken()}`,
      body: { address },
    });

    expect(response.status).toBe(200);
    const session = sessionSchema.parse(await response.json());
    expect(session.expiresAt).toBe("2026-11-21T13:00:00.000Z");
    expect(logs.info).toHaveBeenCalledExactlyOnceWith(
      { address, walletType: type },
      "Session created",
    );
  });

  it("never logs the email or the name", async () => {
    await openSession(makeApp());

    const logged = JSON.stringify(logs.info.mock.calls);
    expect(logged).not.toContain("ual.es");
    expect(logged).not.toContain("Student");
  });

  it.each<[string, () => Promise<string>]>([
    ["another audience", () => idToken({ audience: "another-project" })],
    ["another issuer", () => idToken({ issuer: "example.com" })],
    [
      "an expired token",
      () => idToken({ expiresAt: new Date(NOW.getTime() - 1000) }),
    ],
    [
      "a token signed by another key",
      () => idToken({ key: otherKeys.privateKey }),
    ],
    [
      "a token without wallets",
      () => idToken({ claims: { wallets: undefined } }),
    ],
    ["garbage", () => Promise.resolve("not-a-jwt")],
  ])("rejects %s with invalid_token", async (_, makeToken) => {
    const response = await postSession(makeApp(), {
      authorization: `Bearer ${await makeToken()}`,
      body: { address: APP_KEY_ADDRESS },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "invalid_token" });
    expect(logs.info).not.toHaveBeenCalled();
  });

  it.each([
    ["no header", undefined],
    ["another scheme", "Basic dXNlcjpwYXNz"],
    ["an empty bearer", "Bearer "],
    ["a bearer with spaces", "Bearer a b"],
  ])("rejects %s with invalid_token", async (_, authorization) => {
    const response = await postSession(makeApp(), {
      authorization,
      body: { address: APP_KEY_ADDRESS },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "invalid_token" });
  });

  it("rejects an address that isn't in the token", async () => {
    const response = await postSession(makeApp(), {
      authorization: `Bearer ${await idToken()}`,
      body: { address: OTHER_ADDRESS },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "address_mismatch" });
  });

  it("rejects a token without ed25519 keys", async () => {
    const token = await idToken({
      claims: { wallets: WALLETS.filter((w) => w.curve !== "ed25519") },
    });

    const response = await postSession(makeApp(), {
      authorization: `Bearer ${token}`,
      body: { address: APP_KEY_ADDRESS },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "no_solana_key" });
  });

  it.each([
    ["no address", {}],
    ["an address that isn't a Solana address", { address: "0x1234" }],
    ["a body that isn't JSON", "{"],
  ])("rejects %s with 400", async (_, body) => {
    const response = await postSession(makeApp(), {
      authorization: `Bearer ${await idToken()}`,
      body,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "invalid_body" });
  });
});

describe("GET /auth/me", () => {
  it("returns the session's address", async () => {
    const app = makeApp();
    const { token } = await openSession(app);

    const response = await getMe(app, `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ address: APP_KEY_ADDRESS });
  });

  it("rejects a request without a session", async () => {
    const response = await getMe(makeApp());

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "invalid_session" });
  });

  it("rejects a tampered session", async () => {
    const app = makeApp();
    const { token } = await openSession(app);
    const [header = "", , signature = ""] = token.split(".");
    const payload = Buffer.from(
      JSON.stringify({ sub: OTHER_ADDRESS, exp: seconds(NOW) + 3600 }),
    ).toString("base64url");

    const response = await getMe(
      app,
      `Bearer ${header}.${payload}.${signature}`,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "invalid_session" });
  });

  it("rejects a session signed by another process", async () => {
    const { token } = await openSession(makeApp());

    const response = await getMe(makeApp(), `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it("rejects an expired session", async () => {
    const app = makeApp();
    const { token } = await openSession(app);
    vi.setSystemTime(NOW.getTime() + 60 * 60 * 1000 + 1000);

    const response = await getMe(app, `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(await response.json()).toStrictEqual({ error: "invalid_session" });
  });

  it("rejects a Web3Auth identity token", async () => {
    const response = await getMe(makeApp(), `Bearer ${await idToken()}`);

    expect(response.status).toBe(401);
  });
});
