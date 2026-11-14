import { z } from "zod";

/**
 * Search params of `/pay`. Only the shape: checking the link needs the payer
 * (`createPaymentLinkSchema`), so the route does it. A missing or garbled
 * link becomes `""`, which the route rejects with a message, instead of an
 * error screen.
 */
export const paySearchSchema = z.object({ link: z.string().catch("") });
