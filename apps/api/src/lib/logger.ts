import { pino } from "pino";

import { ENV } from "#/config/env";

/**
 * pino's `err` serializer, safe for frozen errors. The standard one tags every
 * error-like object it walks, which throws on a frozen one
 * (pinojs/pino-std-serializers#216): `@solana/kit` freezes the `context` of its
 * errors, and an RPC HTTP error's `context` has a `message`. Without this, a
 * failing RPC turned the log call, and so the request, into a 500.
 */
export function serializeError(err: unknown): unknown {
  if (!(err instanceof Error)) return err;
  try {
    return pino.stdSerializers.err(err);
  } catch {
    return {
      ...Object.fromEntries(Object.entries(err)),
      type: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
}

export const log = pino({
  level: ENV.logLevel,
  serializers: { err: serializeError },
});
