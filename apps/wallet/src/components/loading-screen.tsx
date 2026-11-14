import { LoaderCircleIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function LoadingScreen({ label = m.loading() }: { label?: string }) {
  return (
    <output className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-6 animate-spin" />
      {label}
    </output>
  );
}
