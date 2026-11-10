import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";
import * as React from "react";

/**
 * A card that opens and closes. It's a native `<details>`: closed unless
 * `open`, and it needs no state.
 */
function CollapsibleCard({
  className,
  ...props
}: React.ComponentProps<"details">) {
  return (
    <details
      data-slot="collapsible-card"
      className={cn(
        "group/collapsible-card overflow-hidden rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    />
  );
}

/** The always visible part: click it to open or close the card. */
function CollapsibleCardTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"summary">) {
  return (
    <summary
      data-slot="collapsible-card-trigger"
      className={cn(
        "flex cursor-pointer list-none items-center gap-2 p-4 font-heading text-base leading-snug font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&::-webkit-details-marker]:hidden",
        className,
      )}
      {...props}
    >
      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground transition-transform group-open/collapsible-card:rotate-90"
        aria-hidden
      />
      {children}
    </summary>
  );
}

function CollapsibleCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="collapsible-card-content"
      className={cn("flex flex-col gap-4 px-4 pb-4", className)}
      {...props}
    />
  );
}

export { CollapsibleCard, CollapsibleCardTrigger, CollapsibleCardContent };
