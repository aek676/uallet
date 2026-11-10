import { z } from "zod";

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
            ? "Escribe tu correo."
            : "Escribe un correo válido.",
        abort: true,
      })
      .refine(
        isUniversityEmail,
        `Usa tu correo de la universidad (@${UNIVERSITY_EMAIL_DOMAINS[0]}).`,
      ),
  );
