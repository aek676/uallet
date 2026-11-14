import { Link } from "@tanstack/react-router";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

type DeadEndCardProps = {
  title: string;
  description: string;
};

/**
 * A screen with nothing to do (unknown page, broken charge link): it only
 * leads to a new charge. `replace`, so back doesn't return here.
 */
export function DeadEndCard({ title, description }: DeadEndCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          size="lg"
          className="w-full"
          nativeButton={false}
          render={<Link to="/" replace />}
        >
          Nuevo cobro
        </Button>
      </CardFooter>
    </Card>
  );
}
