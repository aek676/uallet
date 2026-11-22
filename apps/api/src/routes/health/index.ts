import { Elysia } from "elysia";

import { HealthModel } from "#/routes/health/model";

export const health = new Elysia({ name: "health" }).get(
  "/health",
  () => ({ status: "ok" }) as const,
  { response: HealthModel.healthResponse },
);
