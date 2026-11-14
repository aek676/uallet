import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

export function LoadErrorScreen() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>No se ha podido cargar la wallet</CardTitle>
        <CardDescription>
          Comprueba tu conexión a internet y vuelve a intentarlo.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </CardFooter>
    </Card>
  );
}
