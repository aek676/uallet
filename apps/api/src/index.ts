// Loads and validates the env (`.env.schema`) before anything reads `ENV`.
// oxlint-disable-next-line import/no-unassigned-import
import "varlock/auto-load";
import { app } from "#/app";
import { ENV } from "#/config/env";
import { log } from "#/lib/logger";

app.listen(ENV.port);

log.info(`API running at http://localhost:${ENV.port}`);
