/**
 * The languages of the apps, as in `project.inlang/settings.json` (a test
 * checks they match). English is the base: the fallback for everything.
 */
export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/** Each language in its own name, so anyone finds theirs. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/**
 * The BCP 47 tag `Intl` formats with for each language: US English
 * ("€1.20"), Spanish from Spain ("1,20 €").
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
};
