import { Elysia, t } from "elysia";

/**
 * The API, without listening: `src/index.ts` starts it, and tests call
 * `app.handle(new Request(...))`.
 */
export const app = new Elysia().get(
  "/health",
  () => ({ status: "ok" }) as const,
  { response: t.Object({ status: t.Literal("ok") }) },
);

export type App = typeof app;
