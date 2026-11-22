import { Elysia, StatusMap } from "elysia";

import { log } from "#/lib/logger";

type RequestRecord = { id: string; start: number; error?: unknown };

// Every hook of a request receives the same `Request` object.
const requests = new WeakMap<Request, RequestRecord>();

const UNLOGGED_PATHS = new Set(["/health"]);

/**
 * One log line per response (`Request completed`, or `Request failed` with the
 * error for a 5xx), and `log` in handlers: a child logger with the same
 * `reqId`, so a handler's lines join its request's line.
 */
export const requestLogging = new Elysia({ name: "request-logging" })
  .onRequest(({ request }) => {
    requests.set(request, {
      id: crypto.randomUUID(),
      start: performance.now(),
    });
  })
  .derive(({ request }) => ({
    log: log.child({ reqId: requests.get(request)?.id }),
  }))
  .onError(({ request, error }) => {
    const record = requests.get(request);
    if (record !== undefined) record.error = error;
  })
  .onAfterResponse(({ request, path, set }) => {
    if (UNLOGGED_PATHS.has(path)) return;

    const record = requests.get(request);
    const status =
      typeof set.status === "number"
        ? set.status
        : StatusMap[set.status ?? "OK"];
    const entry = {
      reqId: record?.id,
      method: request.method,
      path,
      status,
      responseTime:
        record === undefined
          ? undefined
          : Math.round(performance.now() - record.start),
    };
    if (status >= 500) {
      log.error({ ...entry, err: record?.error }, "Request failed");
    } else {
      log.info(entry, "Request completed");
    }
  })
  .as("global");
