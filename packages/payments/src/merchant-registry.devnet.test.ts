import {
  address,
  getBase64Encoder,
  lamports,
  type MaybeEncodedAccount,
} from "@solana/kit";
import { describe, expect, it } from "vitest";

import { MERCHANT_REGISTRY } from "./config";
import attestationJson from "./fixtures/merchant-attestation.json";
import {
  getMerchantAttestationAddress,
  readMerchantAttestation,
} from "./merchant-registry";

// "Cafetería Central", registered on devnet with `merchant:add`, as the RPC
// returned it (`getAccountInfo`, base64).
const merchant = address(attestationJson.merchant);
const account: MaybeEncodedAccount = {
  exists: true,
  address: address(attestationJson.address),
  data: new Uint8Array(getBase64Encoder().encode(attestationJson.data)),
  executable: false,
  lamports: lamports(BigInt(attestationJson.lamports)),
  programAddress: address(attestationJson.owner),
  space: BigInt(attestationJson.space),
};

describe("the devnet registry (MERCHANT_REGISTRY)", () => {
  it("derives the address the attestation was created at", async () => {
    await expect(getMerchantAttestationAddress(merchant)).resolves.toBe(
      account.address,
    );
  });

  it("reads the real attestation", () => {
    expect(readMerchantAttestation(account, { merchant })).toEqual({
      registered: true,
      name: "Cafetería Central",
      expiresAt: null,
    });
  });

  it("doesn't accept it for another merchant", () => {
    expect(
      readMerchantAttestation(account, {
        merchant: MERCHANT_REGISTRY.authority,
      }),
    ).toEqual({ registered: false, reason: "wrong-registry" });
  });
});
