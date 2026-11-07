import { z } from "zod";

/** The concept goes in the Solana Pay `message`: longer text makes a denser QR. */
export const MAX_CONCEPT_LENGTH = 60;

export const conceptSchema = z
  .string()
  .trim()
  .max(MAX_CONCEPT_LENGTH, `Usa como mucho ${MAX_CONCEPT_LENGTH} caracteres.`);
