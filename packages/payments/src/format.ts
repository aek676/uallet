import { fromBaseUnits } from "./amount";

/** SOL has 9 decimals: 1 SOL = 1_000_000_000 lamports. */
export const SOL_DECIMALS = 9;

// Truncate, never round up: a balance must not look bigger than it is
// (1,999999 € shows 1,99 €, not 2,00 €).
const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  roundingMode: "trunc",
});

const SOL_FRACTION_DIGITS = 4;

/** Smallest amount `formatSol` shows: 0,0001 SOL. */
const MIN_VISIBLE_LAMPORTS = 10n ** BigInt(SOL_DECIMALS - SOL_FRACTION_DIGITS);

const sol = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: SOL_FRACTION_DIGITS,
  roundingMode: "trunc",
});

function isDecimal(value: string): value is Intl.StringNumericLiteral {
  return /^\d+(\.\d+)?$/.test(value);
}

// `Intl.NumberFormat` formats decimal strings exactly, without going through
// a float. `fromBaseUnits` always returns one.
function toDecimal(units: bigint, decimals: number): Intl.StringNumericLiteral {
  const decimal = fromBaseUnits(units, decimals);
  if (!isDecimal(decimal)) {
    throw new RangeError(`Not a decimal amount: "${decimal}"`);
  }
  return decimal;
}

/** `1_200_000n` (6 decimals) -> `"1,20 €"`. */
export function formatEuros(units: bigint, decimals: number): string {
  return euros.format(toDecimal(units, decimals));
}

/**
 * `1_500_000_000n` lamports -> `"1,5 SOL"`. Dust shows as `"< 0,0001 SOL"`:
 * truncating it to "0 SOL" would look like an empty balance.
 */
export function formatSol(lamports: bigint): string {
  if (lamports > 0n && lamports < MIN_VISIBLE_LAMPORTS) {
    return `< ${sol.format(toDecimal(MIN_VISIBLE_LAMPORTS, SOL_DECIMALS))} SOL`;
  }
  return `${sol.format(toDecimal(lamports, SOL_DECIMALS))} SOL`;
}
