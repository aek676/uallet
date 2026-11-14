import { z } from "zod";

import { conceptSchema } from "#/features/charge/utils/concept";
import type {
  Charge,
  CreateChargeInput,
} from "#/features/charge/utils/create-charge";
import { MAX_CHARGE_UNITS } from "#/features/charge/utils/euro-amount";

/**
 * The search params of `/charges/$reference`: what a charge needs besides its
 * reference, so a reload rebuilds the same charge. The recipient, token and
 * label come from config, never from the URL: an edited link can't send the
 * payment elsewhere.
 *
 * `amount` is in base units of `PAYMENT_TOKEN` (`?amount=1200000`): the
 * router JSON-parses it into a number. Same limits as the form.
 */
export const chargeSearchSchema = z.object({
  amount: z.int().positive().max(Number(MAX_CHARGE_UNITS)),
  concept: conceptSchema.optional(),
});

export type ChargeSearch = z.infer<typeof chargeSearchSchema>;

/**
 * The charge's search, or no amount when the URL isn't a valid charge (edited
 * by hand, cut off...). The keys are explicitly `undefined` because the router
 * spreads this over the raw search.
 */
export type ValidatedChargeSearch =
  | ChargeSearch
  | { amount: undefined; concept: undefined };

/**
 * `validateSearch` of the charge route. It never throws: that would show the
 * generic error screen instead of "this charge isn't valid".
 */
export function validateChargeSearch(search: unknown): ValidatedChargeSearch {
  return (
    chargeSearchSchema.safeParse(search).data ?? {
      amount: undefined,
      concept: undefined,
    }
  );
}

/** The search to show `charge`. The inverse of `toChargeDetails`. */
export function toChargeSearch(charge: Charge): ChargeSearch {
  const { amount, message } = charge.request;
  // Exact: the amount is at most `MAX_CHARGE_UNITS`, far below 2^53.
  return { amount: Number(amount), ...(message ? { concept: message } : {}) };
}

/** What `createCharge` needs from the URL to rebuild the charge. */
export function toChargeDetails({
  amount,
  concept,
}: ChargeSearch): Pick<CreateChargeInput, "amount" | "concept"> {
  return { amount: BigInt(amount), concept };
}
