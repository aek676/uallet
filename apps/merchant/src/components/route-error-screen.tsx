import { DeadEndCard } from "#/components/dead-end-card";

export function RouteErrorScreen() {
  return (
    <DeadEndCard
      title="Algo ha fallado"
      description="No hemos podido mostrar esta pantalla. Vuelve a empezar el cobro."
    />
  );
}
