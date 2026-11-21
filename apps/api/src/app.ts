import { Elysia } from "elysia";

import { log } from "#/lib/logger";
import { health } from "#/routes/health/index";

export const app = new Elysia()
  .use(log.into({ autoLogging: { ignore: ({ path }) => path === "/health" } }))
  .use(health);

export type App = typeof app;
