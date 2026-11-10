import { describe, expect, it } from "vitest";

import {
  EURC,
  PAYMENT_TOKEN,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  type Token,
} from "./config";
import { createReference } from "./reference";
import { encodeTransferRequest, parseTransferRequest } from "./solana-pay";

describe("config", () => {
  it("pays with EURC on the classic Token program for now", () => {
    expect(PAYMENT_TOKEN).toBe(EURC);
    expect(PAYMENT_TOKEN.programAddress).toBe(TOKEN_PROGRAM_ADDRESS);
  });

  it("supports swapping in a Token-2022 token", () => {
    const campusToken: Token = {
      mint: createReference(),
      decimals: 2,
      symbol: "UAL",
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    };
    const request = {
      recipient: createReference(),
      amount: 120n,
      splToken: campusToken.mint,
      reference: [createReference()],
    };

    const link = encodeTransferRequest(request, campusToken.decimals);
    expect(link).toContain("amount=1.2&");
    expect(parseTransferRequest(link, campusToken.decimals)).toEqual(request);
  });
});
