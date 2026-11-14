import { ExternalLinkIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { getExplorerTransactionUrl } from "@repo/payments/explorer";
import { summarize } from "@repo/payments/metrics";
import { Button } from "@repo/ui/components/button";
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardTrigger,
} from "@repo/ui/components/collapsible-card";

import { formatDateTime, formatDuration } from "#/lib/format";
import { m } from "#/paraglide/messages.js";
import {
  type PaymentTiming,
  paymentTimings,
  totalMs,
} from "#/stores/payment-timings";

const STAGES: readonly {
  id: string;
  label: () => string;
  hint: () => string;
  duration: (timing: PaymentTiming) => number;
}[] = [
  {
    id: "total",
    label: m.metrics_stage_total,
    hint: m.metrics_stage_total_hint,
    duration: totalMs,
  },
  {
    id: "prepare",
    label: m.metrics_stage_prepare,
    hint: m.metrics_stage_prepare_hint,
    duration: (timing) => timing.prepareMs,
  },
  {
    id: "sign",
    label: m.metrics_stage_sign,
    hint: m.metrics_stage_sign_hint,
    duration: (timing) => timing.signMs,
  },
  {
    id: "confirm",
    label: m.metrics_stage_confirm,
    hint: m.metrics_stage_confirm_hint,
    duration: (timing) => timing.confirmMs,
  },
];

/** How many of the last payments to list. */
const RECENT = 5;

function StageRow({
  label,
  hint,
  durations,
}: {
  label: string;
  hint: string;
  durations: readonly number[];
}) {
  const summary = summarize(durations);

  return (
    <tr>
      <th
        scope="row"
        title={hint}
        className="py-1 text-left font-normal text-muted-foreground"
      >
        {label}
      </th>
      <td className="py-1 text-right tabular-nums">
        {summary ? formatDuration(summary.p50) : "—"}
      </td>
      <td className="py-1 text-right tabular-nums">
        {summary ? formatDuration(summary.p95) : "—"}
      </td>
    </tr>
  );
}

/** How long the last payments made from this device took, by stage. */
export function MetricsCard() {
  const timings = useSyncExternalStore(
    paymentTimings.subscribe,
    paymentTimings.getSnapshot,
  );
  const recent = timings.slice(-RECENT).toReversed();

  return (
    <CollapsibleCard className="w-full max-w-sm">
      <CollapsibleCardTrigger>
        {m.metrics_title()}
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          {m.metrics_payment_count({ count: timings.length })}
        </span>
      </CollapsibleCardTrigger>
      <CollapsibleCardContent>
        {timings.length === 0 ? (
          <p className="text-muted-foreground">{m.metrics_empty()}</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="pb-1 text-left font-normal">
                    {m.metrics_stage_header()}
                  </th>
                  <th scope="col" className="pb-1 text-right font-normal">
                    {m.metrics_median_header()}
                  </th>
                  <th
                    scope="col"
                    title={m.metrics_p95_hint()}
                    className="pb-1 text-right font-normal"
                  >
                    p95
                  </th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map(({ id, label, hint, duration }) => (
                  <StageRow
                    key={id}
                    label={label()}
                    hint={hint()}
                    durations={timings.map(duration)}
                  />
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-1">
              <h3 className="text-xs text-muted-foreground">
                {m.metrics_recent()}
              </h3>
              <ul className="flex flex-col gap-1">
                {recent.map((timing) => (
                  <li
                    key={timing.signature}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(timing.startedAt)}
                    </span>
                    <a
                      href={getExplorerTransactionUrl(timing.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 tabular-nums underline underline-offset-4"
                    >
                      {formatDuration(totalMs(timing))}
                      <ExternalLinkIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">{m.view_in_explorer()}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              {m.metrics_footnote()}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={paymentTimings.clear}
            >
              {m.metrics_clear()}
            </Button>
          </>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
