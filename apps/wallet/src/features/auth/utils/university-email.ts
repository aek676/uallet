import { z } from "zod";

import { m } from "#/paraglide/messages.js";

export const UNIVERSITY_EMAIL_DOMAINS = ["inlumine.ual.es", "ual.es"] as const;

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function isUniversityEmail(email: string): boolean {
  return (UNIVERSITY_EMAIL_DOMAINS as readonly string[]).includes(
    domainOf(email),
  );
}

export const universityEmailSchema = z
  .string()
  .trim()
  .pipe(
    z
      .email({
        error: (issue) =>
          issue.input === ""
            ? m.wallet_email_required()
            : m.wallet_email_invalid(),
        abort: true,
      })
      .refine(isUniversityEmail, {
        error: () =>
          m.wallet_email_not_university({
            domain: UNIVERSITY_EMAIL_DOMAINS[0],
          }),
      }),
  );
