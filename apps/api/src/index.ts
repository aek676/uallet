// Loads and validates the env (`.env.schema`) before anything reads `ENV`.
// oxlint-disable-next-line import/no-unassigned-import
import "varlock/auto-load";
import { app } from "#/app";
import { ENV } from "#/config/env";

app.listen(ENV.port);

console.log(`API running at http://localhost:${ENV.port}`);
