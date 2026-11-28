import { getCreateAssociatedTokenIdempotentInstruction } from "@solana-program/token";
import {
  findAttestationPda,
  getAttestationDecoder,
  getCloseAttestationInstruction,
  getCreateAttestationInstruction,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
} from "@solana/attestation";
import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  type Address,
  address,
  getBytesDecoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Encoder,
  type Instruction,
  type MaybeEncodedAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
} from "@solana/kit";

import {
  MERCHANT_REGISTRY,
  type MerchantRegistry,
  PAYMENT_TOKEN,
  type Token,
} from "./config";
import { getAssociatedTokenAddress } from "./token-account";

export const MERCHANT_NAME_MAX_LENGTH = 40;

const ATTESTATION_DISCRIMINATOR = 2;

const NEVER_EXPIRES = 0n;

/** The latest moment a `Date` can hold, in seconds. */
const MAX_DATE_SECONDS = 8_640_000_000_000n;

/** SAS's `tokenAccount` of an attestation that isn't tokenized. */
const NOT_TOKENIZED = address("11111111111111111111111111111111");

/**
 * Control (Cc), format (Cf: bidi overrides, zero-width characters, BOM),
 * lone surrogates (Cs), private use (Co), line and paragraph separators.
 */
const FORBIDDEN_CHARACTERS = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/u;

/**
 * Whether `name` can be a merchant's name: 1 to 40 UTF-16 code units, in NFC
 * (so one name has one encoding), no surrounding whitespace, and nothing
 * invisible or that changes how the text around it is shown.
 */
export function isValidMerchantName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MERCHANT_NAME_MAX_LENGTH &&
    name.trim() === name &&
    name.normalize("NFC") === name &&
    !FORBIDDEN_CHARACTERS.test(name)
  );
}

export async function getMerchantAttestationAddress(
  merchant: Address,
  registry: MerchantRegistry = MERCHANT_REGISTRY,
): Promise<Address> {
  const [attestation] = await findAttestationPda({
    credential: registry.credential,
    schema: registry.schema,
    nonce: merchant,
  });
  return attestation;
}

export function encodeMerchantAttestationData(name: string): Uint8Array {
  if (!isValidMerchantName(name)) {
    throw new TypeError(`Invalid merchant name: "${name}"`);
  }
  return new Uint8Array(
    addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder()).encode(name),
  );
}

const nameBytesDecoder = addDecoderSizePrefix(
  getBytesDecoder(),
  getU32Decoder(),
);

// `ignoreBOM` keeps a leading BOM in the text, where the name check rejects
// it, instead of silently dropping it.
const strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function decodeName(data: ReadonlyUint8Array): string | null {
  try {
    const [bytes, end] = nameBytesDecoder.read(data, 0);
    if (end !== data.length) return null;
    const name = strictUtf8.decode(bytes);
    return isValidMerchantName(name) ? name : null;
  } catch {
    return null;
  }
}

export type MerchantRegistration =
  | {
      registered: true;
      name: string;
      expiresAt: Date | null;
    }
  | {
      registered: false;
      reason:
        | "missing"
        | "not-an-attestation"
        | "wrong-registry"
        | "tokenized"
        | "expired"
        | "invalid-expiry"
        | "invalid-name";
    };

export interface ReadMerchantAttestationOptions {
  /** The merchant the account was fetched for. */
  merchant: Address;
  now?: Date;
  registry?: MerchantRegistry;
}

/**
 * Whether `account`, fetched at `getMerchantAttestationAddress(merchant)`,
 * makes `merchant` a registered merchant, and its verified name.
 *
 * On-chain data is untrusted: it checks the owner (SAS), the account type,
 * that the credential, schema and nonce are the registry's and `merchant`,
 * that it isn't tokenized (the registry never tokenizes, and
 * `planMerchantRemoval` couldn't close it), the expiry and the name before
 * believing any of it. SAS itself only lets the credential's authorized
 * signers create attestations under it.
 *
 * It doesn't check which signer signed it: SAS keeps an attestation valid
 * after its signer is removed from the credential (`tools/registry` README).
 */
export function readMerchantAttestation(
  account: MaybeEncodedAccount,
  {
    merchant,
    now = new Date(),
    registry = MERCHANT_REGISTRY,
  }: ReadMerchantAttestationOptions,
): MerchantRegistration {
  if (!account.exists) return { registered: false, reason: "missing" };
  if (
    account.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS ||
    account.data[0] !== ATTESTATION_DISCRIMINATOR
  ) {
    return { registered: false, reason: "not-an-attestation" };
  }

  let attestation: ReturnType<
    ReturnType<typeof getAttestationDecoder>["decode"]
  >;
  try {
    attestation = getAttestationDecoder().decode(account.data);
  } catch {
    return { registered: false, reason: "not-an-attestation" };
  }

  if (
    attestation.credential !== registry.credential ||
    attestation.schema !== registry.schema ||
    attestation.nonce !== merchant
  ) {
    return { registered: false, reason: "wrong-registry" };
  }
  if (attestation.tokenAccount !== NOT_TOKENIZED) {
    return { registered: false, reason: "tokenized" };
  }

  let expiresAt: Date | null = null;
  if (attestation.expiry !== NEVER_EXPIRES) {
    // In whole seconds, as on-chain: from the second it expires.
    if (attestation.expiry <= BigInt(Math.floor(now.getTime() / 1000))) {
      return { registered: false, reason: "expired" };
    }
    if (attestation.expiry > MAX_DATE_SECONDS) {
      return { registered: false, reason: "invalid-expiry" };
    }
    expiresAt = new Date(Number(attestation.expiry) * 1000);
  }

  const name = decodeName(attestation.data);
  if (name === null) return { registered: false, reason: "invalid-name" };

  return { registered: true, name, expiresAt };
}

interface PlanSigners {
  /**
   * An authorized signer of the registry's credential. Use the same object
   * as `payer` when one key does both: Kit rejects two different signers
   * with one address.
   */
  authority: TransactionSigner;
  /** Pays the rent of what is created, and gets it back when closed. */
  payer: TransactionSigner;
}

export interface MerchantRegistrationInput extends PlanSigners {
  merchant: Address;
  name: string;
  /** Fetched at `getMerchantAttestationAddress(merchant, registry)`. */
  attestationAccount: MaybeEncodedAccount;
  /** Fetched at `getAssociatedTokenAddress(merchant, token)`. */
  tokenAccount: MaybeEncodedAccount;
  token?: Pick<Token, "mint" | "programAddress">;
  registry?: MerchantRegistry;
  now?: Date;
}

export interface MerchantRegistrationPlan {
  attestation: Address;
  tokenAccount: Address;
  /**
   * The instructions of the one transaction to send. Empty when the merchant
   * is already registered with this name, without expiry, and has its token
   * account.
   */
  instructions: Instruction[];
}

/**
 * Where `merchant`'s attestation is, and whether there's one to close.
 *
 * Anyone can send SOL to the address before the attestation exists, which
 * makes it a System account with no data. That isn't an attestation, and
 * doesn't get in the way: SAS's create funds, allocates and assigns it.
 */
async function locateAttestation(
  merchant: Address,
  account: MaybeEncodedAccount,
  registry: MerchantRegistry,
): Promise<{ attestation: Address; exists: boolean }> {
  const attestation = await getMerchantAttestationAddress(merchant, registry);
  if (account.address !== attestation) {
    throw new Error(
      `Fetched ${account.address}, but ${merchant}'s attestation is ${attestation}`,
    );
  }
  if (
    !account.exists ||
    account.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    return { attestation, exists: false };
  }
  const current = readMerchantAttestation(account, { merchant, registry });
  if (!current.registered && current.reason === "tokenized") {
    throw new Error(
      `${attestation} is a tokenized attestation, which the registry never creates and CloseAttestation can't close`,
    );
  }
  return { attestation, exists: true };
}

/**
 * The transaction that registers `merchant` as `name`, or renames it, and
 * creates its token account for `token` if missing, so the sponsored fee
 * payer never has to.
 *
 * SAS can't update an attestation, so renaming closes the old one and creates
 * the new one at the same address, in the same transaction: the merchant is
 * never unregistered in between. Attestations never expire (`expiry` 0), and
 * one that does is replaced; removing a merchant is `planMerchantRemoval`.
 */
export async function planMerchantRegistration({
  merchant,
  name,
  authority,
  payer,
  attestationAccount,
  tokenAccount,
  token = PAYMENT_TOKEN,
  registry = MERCHANT_REGISTRY,
  now = new Date(),
}: MerchantRegistrationInput): Promise<MerchantRegistrationPlan> {
  const data = encodeMerchantAttestationData(name);
  const [{ attestation, exists }, tokenAccountAddress] = await Promise.all([
    locateAttestation(merchant, attestationAccount, registry),
    getAssociatedTokenAddress(merchant, token),
  ]);
  if (tokenAccount.address !== tokenAccountAddress) {
    throw new Error(
      `Fetched ${tokenAccount.address}, but ${merchant}'s token account is ${tokenAccountAddress}`,
    );
  }

  const instructions: Instruction[] = [];

  const current = readMerchantAttestation(attestationAccount, {
    merchant,
    now,
    registry,
  });
  const upToDate =
    current.registered && current.name === name && current.expiresAt === null;
  if (!upToDate) {
    if (exists) {
      instructions.push(
        getCloseAttestationInstruction({
          payer,
          authority,
          credential: registry.credential,
          attestation,
        }),
      );
    }
    instructions.push(
      getCreateAttestationInstruction({
        payer,
        authority,
        credential: registry.credential,
        schema: registry.schema,
        attestation,
        nonce: merchant,
        data,
        expiry: NEVER_EXPIRES,
      }),
    );
  }

  // Only the ATA program can create an account owned by the token program at
  // this address, so that is the token account. Anything else there is SOL
  // someone sent, which the ATA program creates over.
  if (
    !tokenAccount.exists ||
    tokenAccount.programAddress !== token.programAddress
  ) {
    instructions.push(
      getCreateAssociatedTokenIdempotentInstruction({
        payer,
        ata: tokenAccountAddress,
        owner: merchant,
        mint: token.mint,
        tokenProgram: token.programAddress,
      }),
    );
  }

  return { attestation, tokenAccount: tokenAccountAddress, instructions };
}

export interface MerchantRemovalInput extends PlanSigners {
  merchant: Address;
  /** Fetched at `getMerchantAttestationAddress(merchant, registry)`. */
  attestationAccount: MaybeEncodedAccount;
  registry?: MerchantRegistry;
}

/**
 * The transaction that removes `merchant`: closes its attestation, and the
 * rent goes back to `payer`. Its token account and balance stay: they're the
 * merchant's. Empty when there's no attestation.
 */
export async function planMerchantRemoval({
  merchant,
  authority,
  payer,
  attestationAccount,
  registry = MERCHANT_REGISTRY,
}: MerchantRemovalInput): Promise<{
  attestation: Address;
  instructions: Instruction[];
}> {
  const { attestation, exists } = await locateAttestation(
    merchant,
    attestationAccount,
    registry,
  );
  if (!exists) return { attestation, instructions: [] };
  return {
    attestation,
    instructions: [
      getCloseAttestationInstruction({
        payer,
        authority,
        credential: registry.credential,
        attestation,
      }),
    ],
  };
}
