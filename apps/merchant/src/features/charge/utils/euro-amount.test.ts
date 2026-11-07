import { describe, expect, it } from "vitest";

import { euroAmountSchema } from "#/features/charge/utils/euro-amount";

const EMPTY = "Escribe un importe.";
const INVALID = "Escribe un importe válido, por ejemplo 1,20.";
const TOO_MANY_DECIMALS = "Usa como mucho 2 decimales.";
const ZERO = "El importe tiene que ser mayor que 0.";
const TOO_LARGE = "El máximo por cobro es 100 €.";

describe("euroAmountSchema", () => {
  it.each([
    ["1,20", 1_200_000n],
    ["1.20", 1_200_000n],
    ["1,2", 1_200_000n],
    ["0,10", 100_000n],
    ["0,01", 10_000n],
    ["1", 1_000_000n],
    ["01,50", 1_500_000n],
    [" 3,50 ", 3_500_000n],
    ["100", 100_000_000n],
    ["100,00", 100_000_000n],
  ])("parses %j as %s base units", (input, units) => {
    expect(euroAmountSchema.parse(input)).toBe(units);
  });

  it.each([
    ["", EMPTY],
    ["   ", EMPTY],
    ["abc", INVALID],
    ["-1", INVALID],
    ["+1", INVALID],
    ["1e2", INVALID],
    [",50", INVALID],
    ["1,", INVALID],
    ["1,2,3", INVALID],
    ["1.000,50", INVALID],
    ["1 €", INVALID],
    ["١", INVALID],
    ["1,234", TOO_MANY_DECIMALS],
    ["0,001", TOO_MANY_DECIMALS],
    ["0", ZERO],
    ["0,00", ZERO],
    ["100,01", TOO_LARGE],
    ["120", TOO_LARGE],
  ])("rejects %j with %j", (input, message) => {
    const result = euroAmountSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      message,
    ]);
  });
});
