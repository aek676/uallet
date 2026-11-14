import {
  formatDateTime as formatDateTimeIn,
  formatDuration as formatDurationIn,
  formatEuros as formatEurosIn,
} from "@repo/payments/format";

import { intlLocale } from "#/lib/i18n";

// `@repo/payments/format` in the app's language.

export function formatEuros(units: bigint, decimals: number): string {
  return formatEurosIn(units, decimals, intlLocale());
}

export function formatDuration(ms: number): string {
  return formatDurationIn(ms, intlLocale());
}

export function formatDateTime(timestamp: number): string {
  return formatDateTimeIn(timestamp, intlLocale());
}

// Built once: changing the language reloads the page.
const percent = new Intl.NumberFormat(intlLocale(), {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatPercent(value: number): string {
  return percent.format(value);
}
