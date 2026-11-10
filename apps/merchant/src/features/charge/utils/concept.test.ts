import { describe, expect, it } from "vitest";

import {
  conceptSchema,
  MAX_CONCEPT_LENGTH,
} from "#/features/charge/utils/concept";

describe("conceptSchema", () => {
  it.each([
    ["Café con leche", "Café con leche"],
    ["  Bocadillo  ", "Bocadillo"],
    ["", ""],
  ])("accepts %j as %j", (input, output) => {
    expect(conceptSchema.parse(input)).toBe(output);
  });

  it("accepts the maximum length, ignoring surrounding spaces", () => {
    const concept = "a".repeat(MAX_CONCEPT_LENGTH);
    expect(conceptSchema.parse(`  ${concept}  `)).toBe(concept);
  });

  it("rejects longer concepts", () => {
    const result = conceptSchema.safeParse("a".repeat(MAX_CONCEPT_LENGTH + 1));

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      `Usa como mucho ${MAX_CONCEPT_LENGTH} caracteres.`,
    ]);
  });
});
