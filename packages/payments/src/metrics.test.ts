import { describe, expect, it } from "vitest";

import { percentile, summarize } from "./metrics";

describe("percentile", () => {
  it.each([
    [50, 3],
    [95, 5],
    [100, 5],
    [1, 1],
    [20, 1],
    [21, 2],
  ])("p%s of 1..5 is %s", (p, expected) => {
    expect(percentile([5, 3, 1, 4, 2], p)).toBe(expected);
  });

  it("takes the lower of the two middle samples as the median", () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
  });

  it("is the maximum for p95 until there are more than 20 samples", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => index + 1);
    expect(percentile(twenty, 95)).toBe(19);
    expect(percentile(twenty.slice(0, 19), 95)).toBe(19);
    expect(percentile([...twenty, 21], 95)).toBe(20);
  });

  it("is the only sample when there is one", () => {
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 95)).toBe(7);
  });

  it("is null without samples", () => {
    expect(percentile([], 50)).toBeNull();
  });

  it("doesn't change the samples", () => {
    const values = [3, 1, 2];
    percentile(values, 50);
    expect(values).toEqual([3, 1, 2]);
  });

  it.each([0, -1, 101, Number.NaN])("rejects p = %s", (p) => {
    expect(() => percentile([1], p)).toThrow(RangeError);
  });
});

describe("summarize", () => {
  it("summarizes the samples", () => {
    expect(summarize([900, 1200, 700, 4000, 1000])).toEqual({
      count: 5,
      min: 700,
      p50: 1000,
      p95: 4000,
      max: 4000,
    });
  });

  it("is null without samples", () => {
    expect(summarize([])).toBeNull();
  });
});
