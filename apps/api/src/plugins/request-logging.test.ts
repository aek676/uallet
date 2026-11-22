import { Elysia } from "elysia";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { z } from "zod";

import { spyOnRequestLogs } from "#/lib/log-spy";
import { log } from "#/lib/logger";
import { requestLogging } from "#/plugins/request-logging";

const app = new Elysia()
  .use(requestLogging)
  .get("/health", () => "ok")
  .get("/ok", ({ log: requestLog }) => {
    requestLog.info("in the handler");
    return "ok";
  })
  .get("/forbidden", ({ status }) => status(403, "Forbidden"))
  .get("/boom", () => {
    throw new Error("boom");
  });

const entrySchema = z.object({
  reqId: z.uuid(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  responseTime: z.number(),
});

/** The response lines logged with `message`, once the response is sent. */
async function responseLogs(
  spy: MockInstance<typeof log.info>,
  message: string,
  path: string,
) {
  const find = () =>
    spy.mock.calls
      .filter((args) => args[1] === message)
      .map(([entry]) => entry)
      .filter((entry) => entrySchema.safeParse(entry).data?.path === path);
  // `onAfterResponse` runs after `handle` resolves.
  await vi.waitFor(() => {
    expect(find()).not.toHaveLength(0);
  });
  return find();
}

let logs: ReturnType<typeof spyOnRequestLogs>;

beforeEach(() => {
  logs = spyOnRequestLogs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestLogging", () => {
  it("logs each response, and gives handlers a logger with its reqId", async () => {
    const info = vi.spyOn(log, "info");
    await app.handle(new Request("http://localhost/ok"));

    const [entry] = await responseLogs(info, "Request completed", "/ok");
    const { reqId } = entrySchema.parse(entry);
    expect(entry).toMatchObject({ method: "GET", path: "/ok", status: 200 });
    expect(logs.child).toHaveBeenCalledWith({ reqId });
    expect(logs.info).toHaveBeenCalledWith("in the handler");
  });

  it("logs a 4xx as info", async () => {
    const info = vi.spyOn(log, "info");
    await app.handle(new Request("http://localhost/forbidden"));

    const [entry] = await responseLogs(info, "Request completed", "/forbidden");
    expect(entry).toMatchObject({ status: 403 });
  });

  it("logs a 5xx as an error, with the error", async () => {
    const error = vi.spyOn(log, "error");
    await app.handle(new Request("http://localhost/boom"));

    const [entry] = await responseLogs(error, "Request failed", "/boom");
    expect(entry).toMatchObject({ status: 500, err: new Error("boom") });
  });

  it("doesn't log /health", async () => {
    const info = vi.spyOn(log, "info");
    await app.handle(new Request("http://localhost/health"));
    await app.handle(new Request("http://localhost/ok"));

    await responseLogs(info, "Request completed", "/ok");
    expect(
      info.mock.calls.filter(
        ([entry]) => entrySchema.safeParse(entry).data?.path === "/health",
      ),
    ).toHaveLength(0);
  });
});
