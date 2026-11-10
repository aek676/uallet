/**
 * Token amounts are `bigint` base units, never `number`: floats can't hold
 * decimal money exactly (`0.1 + 0.2 !== 0.3`).
 *
 * With 6 decimals (EURC), 1.20 € is `1_200_000n`.
 */

// ASCII digits only, at least one before the decimal point. Same rules as the
// Solana Pay `amount` parameter: no sign, exponent or thousands separator.
const DECIMAL_AMOUNT = /^(\d+)(?:\.(\d+))?$/;

function assertDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError(`Invalid token decimals: ${decimals}`);
  }
}

/** Parses a decimal amount (`"1.20"`) into base units (`1_200_000n`). */
export function toBaseUnits(amount: string, decimals: number): bigint {
  assertDecimals(decimals);

  const match = DECIMAL_AMOUNT.exec(amount);
  if (!match) {
    throw new RangeError(`Invalid amount: "${amount}"`);
  }

  const [, whole = "", fraction = ""] = match;
  if (fraction.length > decimals) {
    throw new RangeError(
      `Amount "${amount}" has more than ${decimals} decimal places`,
    );
  }

  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0")
  );
}

/**
 * Formats base units (`1_200_000n`) as the shortest decimal amount (`"1.2"`).
 *
 * This is the wire format (Solana Pay URLs), not a display format: use
 * `Intl.NumberFormat` in the UI to show "1,20 €".
 */
export function fromBaseUnits(units: bigint, decimals: number): string {
  assertDecimals(decimals);

  if (units < 0n) {
    throw new RangeError(`Invalid amount: ${units} base units`);
  }

  const base = 10n ** BigInt(decimals);
  const whole = units / base;
  const fraction = units % base;
  if (fraction === 0n) {
    return whole.toString();
  }

  const digits = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${digits}`;
}
