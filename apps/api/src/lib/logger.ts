import { createPinoLogger } from "@bogeychan/elysia-logger";

import { ENV } from "#/config/env";

export const log = createPinoLogger({ level: ENV.logLevel });
