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
  type ChargeTiming,
  chargeTimings,
  VIA_LABELS,
} from "#/stores/charge-timings";

const VIAS: readonly {
  via: ChargeTiming["via"];
  label: string;
  hint: string;
}[] = [
  {
    via: "notification",
    label: "Por aviso",
    hint: "El RPC avisó del pago por la suscripción: la vía rápida",
  },
  {
    via: "look-back",
    label: "Por consulta",
    hint: "El aviso no llegó o llegó tarde: lo encontró la consulta de cada segundo",
  },
];

/** How many of the last payments to list. */
const RECENT = 5;

const percent = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 0,
});

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
          ({percent.format(timings.length / total)})
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
        Métricas
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          {timings.length === 1 ? "1 cobro" : `${timings.length} cobros`}
        </span>
      </CollapsibleCardTrigger>
      <CollapsibleCardContent>
        {timings.length === 0 ? (
          <p className="text-muted-foreground">
            Aquí verás cómo se detectan los pagos que cobres en este
            dispositivo.
          </p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="pb-1 text-left font-normal">
                    Detectados
                  </th>
                  <th scope="col" className="pb-1 text-right font-normal">
                    Cobros
                  </th>
                  <th
                    scope="col"
                    title="Lo que tarda en comprobarse el pago una vez detectado: mediana"
                    className="pb-1 text-right font-normal"
                  >
                    Mediana
                  </th>
                  <th
                    scope="col"
                    title="El 95 % de los pagos se comprueba en esto o menos"
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
                    label={label}
                    hint={hint}
                    timings={timings.filter((timing) => timing.via === via)}
                    total={timings.length}
                  />
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-1">
              <h3 className="text-xs text-muted-foreground">Últimos cobros</h3>
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
                      {VIA_LABELS[timing.via]} ·{" "}
                      {formatDuration(timing.validateMs)}
                      <ExternalLinkIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">Ver en el Explorer</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Los tiempos son lo que tarda en comprobarse un pago desde que se
              detecta. Se guardan los últimos 50 cobros.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={chargeTimings.clear}
            >
              Borrar métricas
            </Button>
          </>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
