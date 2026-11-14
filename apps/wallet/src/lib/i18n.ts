import { getLocale, type Locale, locales } from "#/paraglide/runtime.js";

/**
 * The tag `Intl` formats with for each language of the app: US English
 * ("€1.20"), Spanish from Spain ("1,20 €").
 */
const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
};

/** The BCP 47 tag to format numbers and dates in the app's language. */
export function intlLocale(): string {
  return INTL_LOCALES[getLocale()];
}

/** Each language in its own name, so anyone finds theirs. */
const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export const LANGUAGES = locales.map((locale) => ({
  value: locale,
  label: LANGUAGE_NAMES[locale],
}));

/**
 * What the HTML can't know before the app loads: the language is picked at
 * runtime (stored choice, else the browser's).
 */
export function localizeDocument() {
  document.documentElement.lang = getLocale();
}
