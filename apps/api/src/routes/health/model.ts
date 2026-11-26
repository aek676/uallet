import { t, type UnwrapSchema } from "elysia";

export const HealthModel = {
  healthResponse: t.Object({ status: t.Literal("ok") }),
};

export type HealthModel = {
  [k in keyof typeof HealthModel]: UnwrapSchema<(typeof HealthModel)[k]>;
};
