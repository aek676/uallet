import { type Address, getAddressDecoder, getBase16Encoder } from "@solana/kit";
import { errors, type JWTVerifyGetKey, jwtVerify } from "jose";
import { z } from "zod";

const claimsSchema = z.object({
  wallets: z.array(
    z.object({
      public_key: z.string(),
      type: z.string(),
      curve: z.string(),
    }),
  ),
});

const ED25519_HEX_KEY = /^[0-9a-f]{64}$/i;

export type IdTokenVerification =
  | {
      ok: true;
      address: Address;
      walletType: string;
    }
  | {
      ok: false;
      error: "invalid_token" | "address_mismatch" | "no_solana_key";
    };

export type IdTokenVerifierOptions = {
  jwks: JWTVerifyGetKey;
  audience: string;
  issuer: string;
};

export function createIdTokenVerifier({
  jwks,
  audience,
  issuer,
}: IdTokenVerifierOptions) {
  const addressDecoder = getAddressDecoder();
  const hexEncoder = getBase16Encoder();

  return async function verifyIdToken(
    idToken: string,
    claimedAddress: Address,
  ): Promise<IdTokenVerification> {
    let payload: unknown;
    try {
      ({ payload } = await jwtVerify(idToken, jwks, {
        algorithms: ["ES256"],
        issuer,
        audience,
        requiredClaims: ["exp"],
      }));
    } catch (error) {
      if (isTokenError(error)) {
        return { ok: false, error: "invalid_token" };
      }
      throw error;
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) {
      return { ok: false, error: "invalid_token" };
    }

    const solanaKeys = claims.data.wallets.filter(
      (wallet) =>
        wallet.curve === "ed25519" && ED25519_HEX_KEY.test(wallet.public_key),
    );
    if (solanaKeys.length === 0) {
      return { ok: false, error: "no_solana_key" };
    }

    const match = solanaKeys.find(
      (wallet) =>
        addressDecoder.decode(
          hexEncoder.encode(wallet.public_key.toLowerCase()),
        ) === claimedAddress,
    );
    if (!match) {
      return { ok: false, error: "address_mismatch" };
    }

    return { ok: true, address: claimedAddress, walletType: match.type };
  };
}

export type VerifyIdToken = ReturnType<typeof createIdTokenVerifier>;

const TOKEN_ERRORS = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
];

function isTokenError(error: unknown): boolean {
  return TOKEN_ERRORS.some((TokenError) => error instanceof TokenError);
}
