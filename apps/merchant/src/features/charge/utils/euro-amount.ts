import { z } from "zod";

import { toBaseUnits } from "@repo/payments/amount";
import { PAYMENT_TOKEN } from "@repo/payments/config";

import { formatEuros } from "#/lib/format";
import { m } from "#/paraglide/messages.js";

export const MAX_CHARGE_EUROS = "100";

export const MAX_CHARGE_UNITS = toBaseUnits(
  MAX_CHARGE_EUROS,
  PAYMENT_TOKEN.decimals,
);

// Digits with an optional comma or dot and up to 2 decimals (cents), in any
// language. At least one digit before the separator. No thousands
// separators: "1.000" or "1,000" would be ambiguous.
const EURO_AMOUNT = /^\d+(?:[.,]\d{1,2})?$/;
const HAS_MORE_DECIMALS = /^\d+[.,]\d{3,}$/;

/**
 * Validates what the shop assistant types ("1,20", "1.20", "1") and
 * transforms it into base units of the payment token (`1_200_000n` with 6
 * decimals).
 *
 * Messages are functions: built when validating, in the current language.
 */
export const euroAmountSchema = z
  .string()
  .trim()
  .min(1, { error: () => m.amount_required(), abort: true })
  .refine((value) => !HAS_MORE_DECIMALS.test(value), {
    error: () => m.amount_too_many_decimals(),
    abort: true,
  })
  .regex(EURO_AMOUNT, { error: () => m.amount_invalid() })
  .transform((value) =>
    toBaseUnits(value.replace(",", "."), PAYMENT_TOKEN.decimals),
  )
  .pipe(
    z
      .bigint()
      .positive({ error: () => m.amount_not_positive() })
      .max(MAX_CHARGE_UNITS, {
        error: () =>
          m.amount_too_large({
            max: formatEuros(MAX_CHARGE_UNITS, PAYMENT_TOKEN.decimals),
          }),
      }),
  );
