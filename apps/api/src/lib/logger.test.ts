import {
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  SolanaError,
} from "@solana/kit";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { serializeError } from "#/lib/logger";

/** What `@solana/kit` throws when the RPC answers an HTTP error. */
function rpcHttpError() {
  return new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, {
    headers: new Headers(),
    message: "Internal Server Error",
    statusCode: 500,
  });
}

describe("serializeError", () => {
  // If this starts failing, pinojs/pino-std-serializers#216 is fixed and
  // `serializeError` can go.
  it("is needed: pino's serializer throws on a Solana RPC error", () => {
    expect(() => pino.stdSerializers.err(rpcHttpError())).toThrow(TypeError);
  });

  it("serializes a Solana RPC error with its context", () => {
    const serialized = z
      .object({
        type: z.literal("SolanaError"),
        message: z.string(),
        stack: z.string(),
        context: z.object({ statusCode: z.number() }),
      })
      .parse(serializeError(rpcHttpError()));

    expect(serialized.context.statusCode).toBe(500);
  });

  it("leaves other errors to pino's serializer", () => {
    const error = new Error("boom", { cause: new Error("root") });

    expect(serializeError(error)).toMatchObject({
      type: "Error",
      message: "boom: root",
    });
  });
});
