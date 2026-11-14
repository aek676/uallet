import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

type LoadErrorScreenProps = {
  title?: string;
  description?: string;
};

export function LoadErrorScreen({
  title = "No se ha podido cargar la wallet",
  description = "Comprueba tu conexión a internet y vuelve a intentarlo.",
}: LoadErrorScreenProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </CardFooter>
    </Card>
  );
}
