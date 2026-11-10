import { isAddress } from "@solana/kit";
import { describe, expect, it } from "vitest";

import { createReference } from "./reference";

describe("createReference", () => {
  it("returns a valid address", () => {
    expect(isAddress(createReference())).toBe(true);
  });

  it("returns a different address every time", () => {
    const references = new Set(Array.from({ length: 100 }, createReference));
    expect(references.size).toBe(100);
  });
});
