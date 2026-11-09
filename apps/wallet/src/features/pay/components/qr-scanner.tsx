import type { Address } from "@solana/kit";
import { LoaderCircleIcon } from "lucide-react";
import { useRef, useState } from "react";

import type { TransferRequest } from "@repo/payments/solana-pay";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import {
  type QrScannerError,
  useQrScanner,
} from "#/features/pay/hooks/use-qr-scanner";
import { createPaymentLinkSchema } from "#/features/pay/utils/payment-link";

const ERROR_MESSAGES: Record<QrScannerError, string> = {
  "insecure-context":
    "La cámara solo funciona en una conexión segura (HTTPS). Pega el enlace.",
  "permission-denied":
    "Permite el acceso a la cámara en tu navegador o pega el enlace.",
  "no-camera": "No encontramos ninguna cámara. Pega el enlace.",
  failed: "No se ha podido iniciar el lector de QR. Pega el enlace.",
};

type QrScannerProps = {
  payer: Address;
  onRequest: (request: TransferRequest) => void;
  onCancel: () => void;
};

export function QrScanner({ payer, onRequest, onCancel }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const schema = createPaymentLinkSchema(payer);

  const { error, scanning } = useQrScanner(videoRef, (values) => {
    const results = [...new Set(values)].map((value) =>
      schema.safeParse(value),
    );
    const requests = results.flatMap((result) =>
      result.success ? [result.data] : [],
    );
    const [request] = requests;
    // Keeps scanning in both rejections: the student can point at another code.
    if (requests.length > 1) {
      // Choosing one could pay the wrong code: a sticker next to the real one.
      setRejection("Hay varios códigos de pago a la vista. Apunta solo a uno.");
    } else if (request) {
      onRequest(request);
    } else {
      setRejection(results[0]?.error?.issues[0]?.message ?? null);
    }
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Escanea el QR</CardTitle>
        <CardDescription>
          Apunta al código que muestra el comercio.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {ERROR_MESSAGES[error]}
          </p>
        ) : (
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <video
              ref={videoRef}
              muted
              playsInline
              className="size-full object-cover"
            />
            {!scanning && (
              <output className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <LoaderCircleIcon className="size-6 animate-spin" />
              </output>
            )}
          </div>
        )}
        {rejection && !error && (
          <p role="alert" className="text-sm text-destructive">
            {rejection}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onCancel}>
          {error ? "Volver" : "Cancelar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
