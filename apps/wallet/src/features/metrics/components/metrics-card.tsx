import { ExternalLinkIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { getExplorerTransactionUrl } from "@repo/payments/explorer";
import { formatDateTime, formatDuration } from "@repo/payments/format";
import { summarize } from "@repo/payments/metrics";
import { Button } from "@repo/ui/components/button";
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardTrigger,
} from "@repo/ui/components/collapsible-card";

import {
  type PaymentTiming,
  paymentTimings,
  totalMs,
} from "#/stores/payment-timings";

const STAGES: readonly {
  label: string;
  hint: string;
  duration: (timing: PaymentTiming) => number;
}[] = [
  {
    label: "Total",
    hint: "Desde que pulsas «Pagar» hasta «Pago realizado»",
    duration: totalMs,
  },
  {
    label: "Preparar",
    hint: "Montar la transacción, pedir el blockhash y simularla",
    duration: (timing) => timing.prepareMs,
  },
  {
    label: "Firmar",
    hint: "La wallet firma la transacción",
    duration: (timing) => timing.signMs,
  },
  {
    label: "Confirmar",
    hint: "Enviarla y esperar a que la red la confirme",
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
        Métricas
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          {timings.length === 1 ? "1 pago" : `${timings.length} pagos`}
        </span>
      </CollapsibleCardTrigger>
      <CollapsibleCardContent>
        {timings.length === 0 ? (
          <p className="text-muted-foreground">
            Aquí verás cuánto tardan los pagos que hagas desde este dispositivo.
          </p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="pb-1 text-left font-normal">
                    Etapa
                  </th>
                  <th scope="col" className="pb-1 text-right font-normal">
                    Mediana
                  </th>
                  <th
                    scope="col"
                    title="El 95 % de los pagos tarda esto o menos"
                    className="pb-1 text-right font-normal"
                  >
                    p95
                  </th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map(({ label, hint, duration }) => (
                  <StageRow
                    key={label}
                    label={label}
                    hint={hint}
                    durations={timings.map(duration)}
                  />
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-1">
              <h3 className="text-xs text-muted-foreground">Últimos pagos</h3>
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
                      <span className="sr-only">Ver en el Explorer</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Medido en este dispositivo, desde que pulsas «Pagar». Se guardan
              los últimos 50 pagos.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={paymentTimings.clear}
            >
              Borrar métricas
            </Button>
          </>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
