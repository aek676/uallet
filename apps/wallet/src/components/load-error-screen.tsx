import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { m } from "#/paraglide/messages.js";

type LoadErrorScreenProps = {
  title?: string;
  description?: string;
};

export function LoadErrorScreen({
  title = m.load_error_title(),
  description = m.load_error_description(),
}: LoadErrorScreenProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" onClick={() => window.location.reload()}>
          {m.retry()}
        </Button>
      </CardFooter>
    </Card>
  );
}
