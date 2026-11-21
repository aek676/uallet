import { Elysia } from "elysia";

import { health } from "#/routes/health/index";

export const app = new Elysia().use(health);

export type App = typeof app;
