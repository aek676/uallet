/**
 * The sample below which `p`% of the samples fall, by nearest rank: always
 * one of the samples, never interpolated. With few samples the high
 * percentiles are the maximum: p95 needs more than 20 to differ from it.
 */
export function percentile(
  values: readonly number[],
  p: number,
): number | null {
  if (!(p > 0 && p <= 100)) {
    throw new RangeError(`Invalid percentile: ${p}`);
  }
  if (values.length === 0) return null;

  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] ?? null;
}

export interface Summary {
  count: number;
  min: number;
  /** The median: half of the samples are at or below it. */
  p50: number;
  /** 95% of the samples are at or below it: the slow cases, not the worst. */
  p95: number;
  max: number;
}

/** `null` without samples: there is nothing to summarize. */
export function summarize(values: readonly number[]): Summary | null {
  const p50 = percentile(values, 50);
  const p95 = percentile(values, 95);
  if (p50 === null || p95 === null) return null;

  return {
    count: values.length,
    min: Math.min(...values),
    p50,
    p95,
    max: Math.max(...values),
  };
}
