import {
  CLOSE_ATTESTATION_DISCRIMINATOR,
  CREATE_ATTESTATION_DISCRIMINATOR,
  findAttestationPda,
  getAttestationEncoder,
  getCreateAttestationInstructionDataDecoder,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
} from "@solana/attestation";
import {
  type Address,
  address,
  createNoopSigner,
  type Instruction,
  lamports,
  type MaybeEncodedAccount,
} from "@solana/kit";
import { describe, expect, it } from "vitest";

import { EURC, type MerchantRegistry } from "./config";
import {
  encodeMerchantAttestationData,
  getMerchantAttestationAddress,
  isValidMerchantName,
  planMerchantRegistration,
  planMerchantRemoval,
  readMerchantAttestation,
} from "./merchant-registry";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  getAssociatedTokenAddress,
} from "./token-account";

const REGISTRY: MerchantRegistry = {
  authority: address("C2bWQzJvB6zuEVJeJ4LDPHBHgKzTRZDza3NFpmLpdKwX"),
  credential: address("9JLQQK3zeEjiq2AJ1XPN765bYnLrBWJSFfyjDwdSMmyN"),
  schema: address("GCVt9SmgLF8bgEVwZAhQ9A2skwj5TvEnyn8Z7eUm583E"),
};
const MERCHANT = address("xUo5vVMjVwiEGZurUHqbX27PXFjiSaKqKQ5rj8d52Ct");
const OTHER = address("FB4F7rai1R7f6BUWWaZvdeni2Uses1Tz1Sm5yWEfYP5o");
const NOW = new Date("2026-11-26T12:00:00Z");
const SYSTEM_DEFAULT = address("11111111111111111111111111111111");

type ExistingAccount = Extract<MaybeEncodedAccount, { exists: true }>;

interface AttestationFields {
  discriminator?: number;
  nonce?: Address;
  credential?: Address;
  schema?: Address;
  data?: Uint8Array;
  expiry?: bigint;
  tokenAccount?: Address;
}

function attestationAccount(
  fields: AttestationFields = {},
  owner: Address = SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
): ExistingAccount {
  const encoded = getAttestationEncoder().encode({
    discriminator: fields.discriminator ?? 2,
    nonce: fields.nonce ?? MERCHANT,
    credential: fields.credential ?? REGISTRY.credential,
    schema: fields.schema ?? REGISTRY.schema,
    data: fields.data ?? encodeMerchantAttestationData("Cafetería Central"),
    signer: REGISTRY.authority,
    expiry: fields.expiry ?? 0n,
    tokenAccount: fields.tokenAccount ?? SYSTEM_DEFAULT,
  });
  const data = new Uint8Array(encoded);
  return {
    exists: true,
    address: OTHER,
    data,
    executable: false,
    lamports: lamports(2_000_000n),
    programAddress: owner,
    space: BigInt(data.length),
  };
}

const read = (account: MaybeEncodedAccount) =>
  readMerchantAttestation(account, {
    merchant: MERCHANT,
    now: NOW,
    registry: REGISTRY,
  });

describe("isValidMerchantName", () => {
  it.each([
    "Cafetería Central",
    "A",
    "x".repeat(40),
    "Bar 24/7 — Ñ",
    "Pizza 🍕",
  ])("accepts %j", (name) => {
    expect(isValidMerchantName(name)).toBe(true);
  });

  it.each([
    "",
    " Bar",
    "Bar ",
    "x".repeat(41),
    "Bar\nBaz",
    "Bar\u0000",
    "Caf\u202Eeteria", // right-to-left override
    "Bar\u200B", // zero-width space
    "\uFEFFBar", // BOM
    "Bar\u2028Baz", // line separator
    "Bar\uE000", // private use
    "Bar\uD83C", // lone surrogate
    "Cafe\u0301", // "Café", but not NFC
  ])("rejects %j", (name) => {
    expect(isValidMerchantName(name)).toBe(false);
  });
});

describe("encodeMerchantAttestationData", () => {
  it("is a u32 little-endian length and the UTF-8 bytes", () => {
    expect([...encodeMerchantAttestationData("Bañ")]).toEqual([
      4, 0, 0, 0, 0x42, 0x61, 0xc3, 0xb1,
    ]);
  });

  it("refuses an invalid name", () => {
    expect(() => encodeMerchantAttestationData(" Bar")).toThrow(TypeError);
  });
});

describe("getMerchantAttestationAddress", () => {
  it("is SAS's attestation PDA with the merchant as nonce", async () => {
    const [expected] = await findAttestationPda({
      credential: REGISTRY.credential,
      schema: REGISTRY.schema,
      nonce: MERCHANT,
    });
    await expect(
      getMerchantAttestationAddress(MERCHANT, REGISTRY),
    ).resolves.toBe(expected);
  });

  it("is different for each merchant", async () => {
    const [a, b] = await Promise.all([
      getMerchantAttestationAddress(MERCHANT, REGISTRY),
      getMerchantAttestationAddress(OTHER, REGISTRY),
    ]);
    expect(a).not.toBe(b);
  });
});

describe("readMerchantAttestation", () => {
  it("reads the name of a valid attestation that never expires", () => {
    expect(read(attestationAccount())).toEqual({
      registered: true,
      name: "Cafetería Central",
      expiresAt: null,
    });
  });

  it("reads the expiry of one that hasn't expired yet", () => {
    const expiry = BigInt(NOW.getTime() / 1000 + 60);
    expect(read(attestationAccount({ expiry }))).toEqual({
      registered: true,
      name: "Cafetería Central",
      expiresAt: new Date(Number(expiry) * 1000),
    });
  });

  it("is missing when the account doesn't exist", () => {
    expect(read({ exists: false, address: OTHER })).toEqual({
      registered: false,
      reason: "missing",
    });
  });

  it("rejects an account another program owns", () => {
    expect(read(attestationAccount({}, SYSTEM_DEFAULT))).toEqual({
      registered: false,
      reason: "not-an-attestation",
    });
  });

  it.each([0, 1, 3])("rejects a SAS account of type %i", (discriminator) => {
    expect(read(attestationAccount({ discriminator }))).toEqual({
      registered: false,
      reason: "not-an-attestation",
    });
  });

  it("rejects data too short to be an attestation", () => {
    const account = attestationAccount();
    expect(read({ ...account, data: new Uint8Array([2, 1, 2, 3]) })).toEqual({
      registered: false,
      reason: "not-an-attestation",
    });
  });

  it.each([
    ["another credential", { credential: OTHER }],
    ["another schema", { schema: OTHER }],
    ["another merchant", { nonce: OTHER }],
  ])("rejects an attestation for %s", (_, fields) => {
    expect(read(attestationAccount(fields))).toEqual({
      registered: false,
      reason: "wrong-registry",
    });
  });

  it("rejects an expired attestation, from the second it expires", () => {
    const expiry = BigInt(NOW.getTime() / 1000);
    expect(read(attestationAccount({ expiry }))).toEqual({
      registered: false,
      reason: "expired",
    });
    const halfSecondLater = new Date(NOW.getTime() + 500);
    expect(
      readMerchantAttestation(attestationAccount({ expiry }), {
        merchant: MERCHANT,
        now: halfSecondLater,
        registry: REGISTRY,
      }),
    ).toEqual({ registered: false, reason: "expired" });
  });

  it.each([8_640_000_000_001n, 9_223_372_036_854_775_807n])(
    "rejects an expiry past what a Date can hold (%i)",
    (expiry) => {
      expect(read(attestationAccount({ expiry }))).toEqual({
        registered: false,
        reason: "invalid-expiry",
      });
    },
  );

  it("rejects a tokenized attestation", () => {
    expect(read(attestationAccount({ tokenAccount: OTHER }))).toEqual({
      registered: false,
      reason: "tokenized",
    });
  });

  it.each([
    ["a length past the end", new Uint8Array([9, 0, 0, 0, 0x42])],
    ["trailing bytes", new Uint8Array([1, 0, 0, 0, 0x42, 0x43])],
    ["invalid UTF-8", new Uint8Array([2, 0, 0, 0, 0xc3, 0x28])],
    ["an empty name", new Uint8Array([0, 0, 0, 0])],
    [
      "a name too long",
      new Uint8Array([41, 0, 0, 0, ...Array.from({ length: 41 }, () => 0x42)]),
    ],
    ["a control character", new Uint8Array([2, 0, 0, 0, 0x42, 0x0a])],
    [
      "a BOM before the name",
      new Uint8Array([6, 0, 0, 0, 0xef, 0xbb, 0xbf, 0x42, 0x61, 0x72]),
    ],
  ])("rejects data with %s", (_, data) => {
    expect(read(attestationAccount({ data }))).toEqual({
      registered: false,
      reason: "invalid-name",
    });
  });
});

const AUTHORITY = createNoopSigner(REGISTRY.authority);
const ATTESTATION = await getMerchantAttestationAddress(MERCHANT, REGISTRY);

/** What each instruction is, to compare plans at a glance. */
function describePlan(instructions: Instruction[]) {
  return instructions.map((instruction) => {
    if (instruction.programAddress === ASSOCIATED_TOKEN_PROGRAM_ADDRESS) {
      return "create token account";
    }
    expect(instruction.programAddress).toBe(
      SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    );
    switch (instruction.data?.[0]) {
      case CREATE_ATTESTATION_DISCRIMINATOR:
        return "create attestation";
      case CLOSE_ATTESTATION_DISCRIMINATOR:
        return "close attestation";
      default:
        return "unexpected";
    }
  });
}

const TOKEN_ACCOUNT = await getAssociatedTokenAddress(MERCHANT, EURC);

/** What anyone can make by sending SOL to an address. */
const fundedWithSol = (at: Address): MaybeEncodedAccount => ({
  exists: true,
  address: at,
  data: new Uint8Array(),
  executable: false,
  lamports: lamports(890_880n),
  programAddress: SYSTEM_DEFAULT,
  space: 0n,
});

const missing: MaybeEncodedAccount = { exists: false, address: ATTESTATION };
const noTokenAccount: MaybeEncodedAccount = {
  exists: false,
  address: TOKEN_ACCOUNT,
};
const hasTokenAccount: MaybeEncodedAccount = {
  exists: true,
  address: TOKEN_ACCOUNT,
  data: new Uint8Array(165),
  executable: false,
  lamports: lamports(2_039_280n),
  programAddress: EURC.programAddress,
  space: 165n,
};
const registeredAs = (
  name: string,
  fields: AttestationFields = {},
): MaybeEncodedAccount => ({
  ...attestationAccount({
    data: encodeMerchantAttestationData(name),
    ...fields,
  }),
  address: ATTESTATION,
});

const plan = (
  account: MaybeEncodedAccount,
  tokenAccount: MaybeEncodedAccount,
  name = "Cafetería Central",
) =>
  planMerchantRegistration({
    merchant: MERCHANT,
    name,
    authority: AUTHORITY,
    payer: AUTHORITY,
    attestationAccount: account,
    tokenAccount,
    token: EURC,
    registry: REGISTRY,
    now: NOW,
  });

describe("planMerchantRegistration", () => {
  it("registers a new merchant and creates its token account", async () => {
    const result = await plan(missing, noTokenAccount);
    expect(describePlan(result.instructions)).toEqual([
      "create attestation",
      "create token account",
    ]);
    expect(result.attestation).toBe(ATTESTATION);
    expect(result.tokenAccount).toBe(TOKEN_ACCOUNT);
  });

  it("writes the name as data, the merchant as nonce, and never expires", async () => {
    const { instructions } = await plan(missing, hasTokenAccount);
    const create = instructions[0];
    expect(create?.data).toBeDefined();
    const data = getCreateAttestationInstructionDataDecoder().decode(
      create?.data ?? new Uint8Array(),
    );
    expect(data.nonce).toBe(MERCHANT);
    expect(data.expiry).toBe(0n);
    expect([...data.data]).toEqual([
      ...encodeMerchantAttestationData("Cafetería Central"),
    ]);
  });

  it("does nothing for a merchant registered with the same name and its token account", async () => {
    const result = await plan(
      registeredAs("Cafetería Central"),
      hasTokenAccount,
    );
    expect(result.instructions).toEqual([]);
  });

  it("only creates the token account if that's all that's missing", async () => {
    const result = await plan(
      registeredAs("Cafetería Central"),
      noTokenAccount,
    );
    expect(describePlan(result.instructions)).toEqual(["create token account"]);
  });

  it("renames by closing and creating in the same transaction", async () => {
    const result = await plan(registeredAs("Old name"), noTokenAccount);
    expect(describePlan(result.instructions)).toEqual([
      "close attestation",
      "create attestation",
      "create token account",
    ]);
  });

  it("replaces an expired attestation", async () => {
    const expiry = BigInt(NOW.getTime() / 1000 - 1);
    const result = await plan(
      registeredAs("Cafetería Central", { expiry }),
      hasTokenAccount,
    );
    expect(describePlan(result.instructions)).toEqual([
      "close attestation",
      "create attestation",
    ]);
  });

  it("replaces one with the same name that will expire", async () => {
    const expiry = BigInt(NOW.getTime() / 1000 + 60);
    const result = await plan(
      registeredAs("Cafetería Central", { expiry }),
      hasTokenAccount,
    );
    expect(describePlan(result.instructions)).toEqual([
      "close attestation",
      "create attestation",
    ]);
  });

  it("creates the attestation over SOL someone sent to its address", async () => {
    const result = await plan(fundedWithSol(ATTESTATION), hasTokenAccount);
    expect(describePlan(result.instructions)).toEqual(["create attestation"]);
  });

  it("creates the token account over SOL someone sent to its address", async () => {
    const result = await plan(
      registeredAs("Cafetería Central"),
      fundedWithSol(TOKEN_ACCOUNT),
    );
    expect(describePlan(result.instructions)).toEqual(["create token account"]);
  });

  it("refuses a tokenized attestation, which it can't close", async () => {
    await expect(
      plan(
        registeredAs("Cafetería Central", { tokenAccount: OTHER }),
        hasTokenAccount,
      ),
    ).rejects.toThrow("tokenized");
  });

  it("refuses an invalid name before anything else", async () => {
    await expect(plan(missing, noTokenAccount, " Bar")).rejects.toThrow(
      TypeError,
    );
  });

  it("refuses an attestation fetched at another address", async () => {
    await expect(
      plan({ exists: false, address: OTHER }, noTokenAccount),
    ).rejects.toThrow("attestation is");
  });

  it("refuses a token account fetched at another address", async () => {
    await expect(
      plan(missing, { exists: false, address: OTHER }),
    ).rejects.toThrow("token account is");
  });
});

const remove = (account: MaybeEncodedAccount) =>
  planMerchantRemoval({
    merchant: MERCHANT,
    authority: AUTHORITY,
    payer: AUTHORITY,
    attestationAccount: account,
    registry: REGISTRY,
  });

describe("planMerchantRemoval", () => {
  it("closes the attestation", async () => {
    const result = await remove(registeredAs("Cafetería Central"));
    expect(describePlan(result.instructions)).toEqual(["close attestation"]);
    expect(result.attestation).toBe(ATTESTATION);
  });

  it("closes an expired one too", async () => {
    const expiry = BigInt(NOW.getTime() / 1000 - 1);
    const result = await remove(registeredAs("Cafetería Central", { expiry }));
    expect(describePlan(result.instructions)).toEqual(["close attestation"]);
  });

  it("does nothing for a merchant that isn't registered", async () => {
    expect((await remove(missing)).instructions).toEqual([]);
  });

  it("does nothing when its address only holds SOL", async () => {
    expect((await remove(fundedWithSol(ATTESTATION))).instructions).toEqual([]);
  });

  it("refuses a tokenized attestation, which it can't close", async () => {
    await expect(
      remove(registeredAs("Cafetería Central", { tokenAccount: OTHER })),
    ).rejects.toThrow("tokenized");
  });
});
