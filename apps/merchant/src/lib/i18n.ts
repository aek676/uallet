import { INTL_LOCALES, LANGUAGE_NAMES } from "@repo/i18n/locales";

import { m } from "#/paraglide/messages.js";
import { getLocale, locales } from "#/paraglide/runtime.js";

// Indexing with this app's `Locale` fails type-checking if it compiles a
// language `@repo/i18n/locales` doesn't know.

/** The BCP 47 tag to format numbers and dates in the app's language. */
export function intlLocale(): string {
  return INTL_LOCALES[getLocale()];
}

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
  document.title = m.merchant_document_title();
}
