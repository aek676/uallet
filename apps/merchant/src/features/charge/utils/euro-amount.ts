import { z } from "zod";

import { toBaseUnits } from "@repo/payments/amount";
import { PAYMENT_TOKEN } from "@repo/payments/config";

export const MAX_CHARGE_EUROS = "100";

const MAX_CHARGE_UNITS = toBaseUnits(MAX_CHARGE_EUROS, PAYMENT_TOKEN.decimals);

// Digits with an optional comma or dot and up to 2 decimals (cents). At
// least one digit before the separator. No thousands separators: "1.000"
// would be ambiguous.
const EURO_AMOUNT = /^\d+(?:[.,]\d{1,2})?$/;
const HAS_MORE_DECIMALS = /^\d+[.,]\d{3,}$/;

/**
 * Validates what the shop assistant types ("1,20", "1.20", "1") and
 * transforms it into base units of the payment token (`1_200_000n` with 6
 * decimals).
 */
export const euroAmountSchema = z
  .string()
  .trim()
  .min(1, { error: "Escribe un importe.", abort: true })
  .refine((value) => !HAS_MORE_DECIMALS.test(value), {
    error: "Usa como mucho 2 decimales.",
    abort: true,
  })
  .regex(EURO_AMOUNT, "Escribe un importe válido, por ejemplo 1,20.")
  .transform((value) =>
    toBaseUnits(value.replace(",", "."), PAYMENT_TOKEN.decimals),
  )
  .pipe(
    z
      .bigint()
      .positive("El importe tiene que ser mayor que 0.")
      .max(MAX_CHARGE_UNITS, `El máximo por cobro es ${MAX_CHARGE_EUROS} €.`),
  );
