import { type Address, isAddress } from "@solana/kit";
import { jwtVerify, SignJWT } from "jose";

const SESSION_ISSUER = "uallet-api";
const SESSION_AUDIENCE = "uallet-api";

const SESSION_TTL_SECONDS = 60 * 60;

export type Session = { token: string; expiresAt: Date };

export type SessionTokensOptions = {
  key: Uint8Array;
};

export function createSessionTokens({ key }: SessionTokensOptions) {
  if (key.byteLength < 32) {
    throw new Error("The session key must be at least 32 bytes");
  }

  async function sign(address: Address): Promise<Session> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + SESSION_TTL_SECONDS;
    const token = await new SignJWT()
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(address)
      .setIssuer(SESSION_ISSUER)
      .setAudience(SESSION_AUDIENCE)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(key);
    return { token, expiresAt: new Date(expiresAt * 1000) };
  }

  async function verify(token: string): Promise<Address | undefined> {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["HS256"],
        issuer: SESSION_ISSUER,
        audience: SESSION_AUDIENCE,
        requiredClaims: ["sub", "exp"],
      });
      return payload.sub !== undefined && isAddress(payload.sub)
        ? payload.sub
        : undefined;
    } catch {
      return undefined;
    }
  }

  return { sign, verify };
}

export type SessionTokens = ReturnType<typeof createSessionTokens>;
