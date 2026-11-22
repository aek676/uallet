// Test helper: only test files import it.
import type { pino } from "pino";
import { type MockInstance, vi } from "vitest";

import { log } from "#/lib/logger";

const LEVELS = ["info", "warn", "error"] as const;

type RequestLogSpies = Record<
  (typeof LEVELS)[number],
  ReturnType<typeof spyFn>
> & {
  /** `log.child`, called once per request with its bindings (`reqId`). */
  child: MockInstance<typeof log.child>;
};

function spyFn() {
  return vi.fn<pino.LogFn>();
}

/**
 * Spies on what handlers log. They log through a child of `log` (the
 * `requestLogging` plugin gives each request one), which has its own methods,
 * so a spy on `log` itself misses them. `vi.restoreAllMocks()` undoes it.
 */
export function spyOnRequestLogs(): RequestLogSpies {
  const levels = { info: spyFn(), warn: spyFn(), error: spyFn() };
  const createChild = log.child.bind(log);
  const child = vi
    .spyOn(log, "child")
    .mockImplementation((bindings, options) => {
      const logger = createChild(bindings, options);
      for (const level of LEVELS) {
        vi.spyOn(logger, level).mockImplementation(levels[level]);
      }
      return logger;
    });
  return { ...levels, child };
}
