import { LoaderCircleIcon } from "lucide-react";

export function LoadingScreen({ label = "Cargando…" }: { label?: string }) {
  return (
    <output className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-6 animate-spin" />
      {label}
    </output>
  );
}
