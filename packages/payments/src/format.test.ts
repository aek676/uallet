import { describe, expect, it } from "vitest";

import { formatDuration, formatEuros, formatSol } from "./format";

// `Intl` separates the amount and the € sign with a non-breaking space.
const normalize = (value: string) => value.replaceAll(" ", " ");

describe("formatEuros", () => {
  it.each([
    [1_200_000n, "1,20 €"],
    [100_000n, "0,10 €"],
    [0n, "0,00 €"],
    [1_234_567_890n, "1234,56 €"],
    [12_345_678_000_000n, "12.345.678,00 €"],
  ])("formats %s base units as %s", (units, expected) => {
    expect(normalize(formatEuros(units, 6))).toBe(expected);
  });

  it("truncates instead of rounding up", () => {
    expect(normalize(formatEuros(1_999_999n, 6))).toBe("1,99 €");
  });

  it("formats amounts beyond float precision exactly", () => {
    expect(normalize(formatEuros(9_007_199_254_740_993_000_000n, 6))).toBe(
      "9.007.199.254.740.993,00 €",
    );
  });

  it("supports other token decimals", () => {
    expect(normalize(formatEuros(120n, 2))).toBe("1,20 €");
  });
});

describe("formatSol", () => {
  it.each([
    [1_500_000_000n, "1,5 SOL"],
    [1_000_000_000n, "1 SOL"],
    [0n, "0 SOL"],
    [5000n, "< 0,0001 SOL"],
    [99_999n, "< 0,0001 SOL"],
    [100_000n, "0,0001 SOL"],
    [123_456_789n, "0,1234 SOL"],
  ])("formats %s lamports as %s", (lamports, expected) => {
    expect(formatSol(lamports)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 ms"],
    [18, "18 ms"],
    [850, "850 ms"],
    [999.4, "999 ms"],
    [999.6, "1,00 s"],
    [1000, "1,00 s"],
    [1234, "1,23 s"],
    [12_345, "12,35 s"],
  ])("formats %s ms as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
