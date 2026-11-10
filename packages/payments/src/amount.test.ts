import { describe, expect, it } from "vitest";

import { fromBaseUnits, toBaseUnits } from "./amount";

describe("toBaseUnits", () => {
  it.each([
    ["1.20", 1_200_000n],
    ["0.10", 100_000n],
    ["1", 1_000_000n],
    ["0", 0n],
    ["1.000000", 1_000_000n],
    ["0.000001", 1n],
    ["123456.789", 123_456_789_000n],
  ])("converts %s to %s base units", (amount, expected) => {
    expect(toBaseUnits(amount, 6)).toBe(expected);
  });

  it("handles tokens without decimals", () => {
    expect(toBaseUnits("42", 0)).toBe(42n);
  });

  it("rejects more decimal places than the token has", () => {
    expect(() => toBaseUnits("1.2345678", 6)).toThrow(RangeError);
    expect(() => toBaseUnits("1.5", 0)).toThrow(RangeError);
  });

  it.each(["", "-1", "+1", "1e3", ".5", "1.", "1,20", " 1", "1 ", "abc", "١"])(
    "rejects %j",
    (amount) => {
      expect(() => toBaseUnits(amount, 6)).toThrow(RangeError);
    },
  );

  it.each([-1, 1.5, Number.NaN])("rejects %s decimals", (decimals) => {
    expect(() => toBaseUnits("1", decimals)).toThrow(RangeError);
  });
});

describe("fromBaseUnits", () => {
  it.each([
    [1_200_000n, "1.2"],
    [100_000n, "0.1"],
    [1_000_000n, "1"],
    [0n, "0"],
    [1n, "0.000001"],
    [123_456_789_000n, "123456.789"],
  ])("formats %s base units as %s", (units, expected) => {
    expect(fromBaseUnits(units, 6)).toBe(expected);
  });

  it("handles tokens without decimals", () => {
    expect(fromBaseUnits(42n, 0)).toBe("42");
  });

  it("rejects negative amounts", () => {
    expect(() => fromBaseUnits(-1n, 6)).toThrow(RangeError);
  });

  it.each(["1.2", "0.1", "1", "0.000001", "999999.999999"])(
    "round-trips %s",
    (amount) => {
      expect(fromBaseUnits(toBaseUnits(amount, 6), 6)).toBe(amount);
    },
  );
});
