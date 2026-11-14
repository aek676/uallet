import { fromBaseUnits } from "./amount";

/** SOL has 9 decimals: 1 SOL = 1_000_000_000 lamports. */
export const SOL_DECIMALS = 9;

/**
 * One `Intl` formatter per locale: building them is slow, and the apps only
 * use one or two locales.
 */
function perLocale<T>(create: (locale: string) => T): (locale: string) => T {
  const formatters = new Map<string, T>();
  return (locale) => {
    let formatter = formatters.get(locale);
    if (!formatter) {
      formatter = create(locale);
      formatters.set(locale, formatter);
    }
    return formatter;
  };
}

// Truncate, never round up: a balance must not look bigger than it is
// (1,999999 € shows 1,99 €, not 2,00 €).
const euros = perLocale(
  (locale) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      roundingMode: "trunc",
    }),
);

const SOL_FRACTION_DIGITS = 4;

/** Smallest amount `formatSol` shows: 0.0001 SOL. */
const MIN_VISIBLE_LAMPORTS = 10n ** BigInt(SOL_DECIMALS - SOL_FRACTION_DIGITS);

const sol = perLocale(
  (locale) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: SOL_FRACTION_DIGITS,
      roundingMode: "trunc",
    }),
);

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

/**
 * `1_200_000n` (6 decimals) -> `"€1.20"` in `en-US`, `"1,20 €"` in `es-ES`.
 * `locale` is a BCP 47 tag, as `Intl` takes it.
 */
export function formatEuros(
  units: bigint,
  decimals: number,
  locale: string,
): string {
  return euros(locale).format(toDecimal(units, decimals));
}

/**
 * `1_500_000_000n` lamports -> `"1.5 SOL"` in `en-US`. Dust shows as
 * `"< 0.0001 SOL"`: truncating it to "0 SOL" would look like an empty
 * balance.
 */
export function formatSol(lamports: bigint, locale: string): string {
  const format = sol(locale);
  if (lamports > 0n && lamports < MIN_VISIBLE_LAMPORTS) {
    return `< ${format.format(toDecimal(MIN_VISIBLE_LAMPORTS, SOL_DECIMALS))} SOL`;
  }
  return `${format.format(toDecimal(lamports, SOL_DECIMALS))} SOL`;
}

const milliseconds = perLocale(
  (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
);

const seconds = perLocale(
  (locale) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
);

/** `850` -> `"850 ms"`, `1234` -> `"1.23 s"` in `en-US`. */
export function formatDuration(ms: number, locale: string): string {
  const rounded = Math.round(ms);
  return rounded < 1000
    ? `${milliseconds(locale).format(rounded)} ms`
    : `${seconds(locale).format(rounded / 1000)} s`;
}

const dateTime = perLocale(
  (locale) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
    }),
);

/**
 * A `Date.now()` timestamp in local time: `"11/10/26, 9:05:07 AM"` in
 * `en-US`.
 */
export function formatDateTime(timestamp: number, locale: string): string {
  return dateTime(locale).format(timestamp);
}
