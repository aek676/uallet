import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import type { Charge } from "#/features/charge/utils/create-charge";

type ChargeQrProps = {
  charge: Charge;
  onCancel: () => void;
};

export function ChargeQr({ charge, onCancel }: ChargeQrProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Esperando pago…</CardTitle>
        <CardDescription>
          El estudiante tiene que escanear el QR con Uallet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-xs break-all text-muted-foreground">
          {charge.url}
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      </CardFooter>
    </Card>
  );
}
