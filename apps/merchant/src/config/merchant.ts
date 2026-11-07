import type { Address } from "@solana/kit";

import { env } from "#/config/env";

export interface Merchant {
  address: Address;
  name: string;
}

/**
 * The merchant this device charges for. The rest of the app reads it only
 * from here.
 *
 * Phase 1: one merchant per device, from env. Phase 2: from the merchant
 * registry in the backend, after the merchant logs in.
 */
export const merchant: Merchant = {
  address: env.merchantAddress,
  name: env.merchantName,
};
