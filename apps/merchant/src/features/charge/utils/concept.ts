import { z } from "zod";

import { m } from "#/paraglide/messages.js";

/** The concept goes in the Solana Pay `message`: longer text makes a denser QR. */
export const MAX_CONCEPT_LENGTH = 60;

export const conceptSchema = z
  .string()
  .trim()
  .max(MAX_CONCEPT_LENGTH, {
    error: () => m.concept_too_long({ max: MAX_CONCEPT_LENGTH }),
  });
