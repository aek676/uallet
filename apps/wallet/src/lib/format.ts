import {
  formatDateTime as formatDateTimeIn,
  formatDuration as formatDurationIn,
  formatEuros as formatEurosIn,
  formatSol as formatSolIn,
} from "@repo/payments/format";

import { intlLocale } from "#/lib/i18n";

// `@repo/payments/format` in the app's language.

export function formatEuros(units: bigint, decimals: number): string {
  return formatEurosIn(units, decimals, intlLocale());
}

export function formatSol(lamports: bigint): string {
  return formatSolIn(lamports, intlLocale());
}

export function formatDuration(ms: number): string {
  return formatDurationIn(ms, intlLocale());
}

export function formatDateTime(timestamp: number): string {
  return formatDateTimeIn(timestamp, intlLocale());
}
