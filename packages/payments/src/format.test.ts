import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatDuration,
  formatEuros,
  formatSol,
} from "./format";

const EN = "en-US";
const ES = "es-ES";

// `Intl` puts (narrow) non-breaking spaces before "€" and "AM".
const normalize = (value: string) => value.replaceAll(/[  ]/g, " ");

describe("formatEuros", () => {
  it.each([
    [1_200_000n, "€1.20", "1,20 €"],
    [100_000n, "€0.10", "0,10 €"],
    [0n, "€0.00", "0,00 €"],
    [1_234_567_890n, "€1,234.56", "1234,56 €"],
    [12_345_678_000_000n, "€12,345,678.00", "12.345.678,00 €"],
  ])("formats %s base units as %s and %s", (units, en, es) => {
    expect(normalize(formatEuros(units, 6, EN))).toBe(en);
    expect(normalize(formatEuros(units, 6, ES))).toBe(es);
  });

  it("truncates instead of rounding up", () => {
    expect(normalize(formatEuros(1_999_999n, 6, EN))).toBe("€1.99");
  });

  it("formats amounts beyond float precision exactly", () => {
    expect(normalize(formatEuros(9_007_199_254_740_993_000_000n, 6, ES))).toBe(
      "9.007.199.254.740.993,00 €",
    );
  });

  it("supports other token decimals", () => {
    expect(normalize(formatEuros(120n, 2, EN))).toBe("€1.20");
  });
});

describe("formatSol", () => {
  it.each([
    [1_500_000_000n, "1.5 SOL", "1,5 SOL"],
    [1_000_000_000n, "1 SOL", "1 SOL"],
    [0n, "0 SOL", "0 SOL"],
    [5000n, "< 0.0001 SOL", "< 0,0001 SOL"],
    [99_999n, "< 0.0001 SOL", "< 0,0001 SOL"],
    [100_000n, "0.0001 SOL", "0,0001 SOL"],
    [123_456_789n, "0.1234 SOL", "0,1234 SOL"],
  ])("formats %s lamports as %s and %s", (lamports, en, es) => {
    expect(formatSol(lamports, EN)).toBe(en);
    expect(formatSol(lamports, ES)).toBe(es);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 ms", "0 ms"],
    [18, "18 ms", "18 ms"],
    [850, "850 ms", "850 ms"],
    [999.4, "999 ms", "999 ms"],
    [999.6, "1.00 s", "1,00 s"],
    [1000, "1.00 s", "1,00 s"],
    [1234, "1.23 s", "1,23 s"],
    [12_345, "12.35 s", "12,35 s"],
  ])("formats %s ms as %s and %s", (ms, en, es) => {
    expect(formatDuration(ms, EN)).toBe(en);
    expect(formatDuration(ms, ES)).toBe(es);
  });
});

describe("formatDateTime", () => {
  it("formats a timestamp in local time, seconds included", () => {
    const timestamp = new Date(2026, 10, 10, 9, 5, 7).getTime();

    expect(normalize(formatDateTime(timestamp, EN))).toBe(
      "11/10/26, 9:05:07 AM",
    );
    expect(formatDateTime(timestamp, ES)).toBe("10/11/26, 9:05:07");
  });
});
