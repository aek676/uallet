import { Link } from "@tanstack/react-router";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { m } from "#/paraglide/messages.js";

type DeadEndCardProps = {
  title: string;
  description: string;
};

/**
 * A screen with nothing to do (unknown page, a link that can't be paid): it
 * only leads home. `replace`, so back doesn't return here.
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
          className="w-full"
          nativeButton={false}
          render={<Link to="/" replace />}
        >
          {m.go_home()}
        </Button>
      </CardFooter>
    </Card>
  );
}
