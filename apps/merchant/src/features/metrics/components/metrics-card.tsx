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

import { formatDateTime, formatDuration, formatPercent } from "#/lib/format";
import { m } from "#/paraglide/messages.js";
import {
  type ChargeTiming,
  chargeTimings,
  VIA_LABELS,
} from "#/stores/charge-timings";

const VIAS: readonly {
  via: ChargeTiming["via"];
  label: () => string;
  hint: () => string;
}[] = [
  {
    via: "notification",
    label: m.merchant_metrics_via_notification_label,
    hint: m.merchant_metrics_via_notification_hint,
  },
  {
    via: "look-back",
    label: m.merchant_metrics_via_look_back_label,
    hint: m.merchant_metrics_via_look_back_hint,
  },
];

/** How many of the last payments to list. */
const RECENT = 5;

function ViaRow({
  label,
  hint,
  timings,
  total,
}: {
  label: string;
  hint: string;
  timings: readonly ChargeTiming[];
  total: number;
}) {
  const summary = summarize(timings.map((timing) => timing.validateMs));

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
        {timings.length}
        <span className="text-muted-foreground">
          {" "}
          ({formatPercent(timings.length / total)})
        </span>
      </td>
      <td className="py-1 text-right tabular-nums">
        {summary ? formatDuration(summary.p50) : "—"}
      </td>
      <td className="py-1 text-right tabular-nums">
        {summary ? formatDuration(summary.p95) : "—"}
      </td>
    </tr>
  );
}

/** How the last payments were detected on this device, and how fast. */
export function MetricsCard() {
  const timings = useSyncExternalStore(
    chargeTimings.subscribe,
    chargeTimings.getSnapshot,
  );
  const recent = timings.slice(-RECENT).toReversed();

  return (
    <CollapsibleCard className="w-full max-w-sm">
      <CollapsibleCardTrigger>
        {m.metrics_title()}
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          {m.merchant_metrics_charge_count({ count: timings.length })}
        </span>
      </CollapsibleCardTrigger>
      <CollapsibleCardContent>
        {timings.length === 0 ? (
          <p className="text-muted-foreground">{m.merchant_metrics_empty()}</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="pb-1 text-left font-normal">
                    {m.merchant_metrics_detected_header()}
                  </th>
                  <th scope="col" className="pb-1 text-right font-normal">
                    {m.merchant_metrics_charges_header()}
                  </th>
                  <th
                    scope="col"
                    title={m.merchant_metrics_median_hint()}
                    className="pb-1 text-right font-normal"
                  >
                    {m.metrics_median_header()}
                  </th>
                  <th
                    scope="col"
                    title={m.merchant_metrics_p95_hint()}
                    className="pb-1 text-right font-normal"
                  >
                    p95
                  </th>
                </tr>
              </thead>
              <tbody>
                {VIAS.map(({ via, label, hint }) => (
                  <ViaRow
                    key={via}
                    label={label()}
                    hint={hint()}
                    timings={timings.filter((timing) => timing.via === via)}
                    total={timings.length}
                  />
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-1">
              <h3 className="text-xs text-muted-foreground">
                {m.merchant_metrics_recent()}
              </h3>
              <ul className="flex flex-col gap-1">
                {recent.map((timing) => (
                  <li
                    key={timing.signature}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(timing.noticedAt)}
                    </span>
                    <a
                      href={getExplorerTransactionUrl(timing.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 tabular-nums underline underline-offset-4"
                    >
                      {VIA_LABELS[timing.via]()} ·{" "}
                      {formatDuration(timing.validateMs)}
                      <ExternalLinkIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">{m.view_in_explorer()}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              {m.merchant_metrics_footnote()}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={chargeTimings.clear}
            >
              {m.metrics_clear()}
            </Button>
          </>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
