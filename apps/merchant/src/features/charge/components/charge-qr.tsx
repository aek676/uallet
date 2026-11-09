import { CopyIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { PAYMENT_TOKEN } from "@repo/payments/config";
import { formatEuros } from "@repo/payments/format";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@repo/ui/components/card";

import type { Charge } from "#/features/charge/utils/create-charge";

type ChargeQrProps = {
  charge: Charge;
  status: "waiting" | "checking" | "error";
  onRetry: () => void;
  onCancel: () => void;
};

export function ChargeQr({ charge, status, onRetry, onCancel }: ChargeQrProps) {
  const { amount, label, message } = charge.request;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(charge.url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se ha podido copiar el enlace");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-5xl font-semibold tabular-nums">
          {formatEuros(amount, PAYMENT_TOKEN.decimals)}
        </p>
        {message && <p className="text-muted-foreground">{message}</p>}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Always black on white: many phone cameras can't read an inverted QR. */}
        <div className="w-full max-w-64 rounded-xl bg-white p-3">
          <QRCodeSVG
            value={charge.url}
            title="QR de pago con Uallet"
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
            className="size-full"
          />
        </div>
        {status === "error" ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-2 text-center text-sm"
          >
            <p className="text-destructive">
              Hemos dejado de escuchar si llega el pago. Si el estudiante ya ha
              pagado, aparecerá al reintentar.
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCwIcon />
              Reintentar
            </Button>
          </div>
        ) : (
          <output className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            {status === "checking" ? "Comprobando el pago…" : "Esperando pago…"}
          </output>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => void copyLink()}
        >
          <CopyIcon />
          Copiar enlace
        </Button>
        {/* Not while checking: it would discard a charge that's being paid. */}
        <Button
          variant="ghost"
          className="flex-1"
          disabled={status === "checking"}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </CardFooter>
    </Card>
  );
}
