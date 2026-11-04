import { Example, Section } from "#components/section";

// Full class names (not interpolated) so Tailwind can detect them.
const colorGroups = [
  {
    title: "Superficies",
    colors: [
      { token: "background", className: "bg-background" },
      { token: "foreground", className: "bg-foreground" },
      { token: "card", className: "bg-card" },
      { token: "popover", className: "bg-popover" },
      { token: "muted", className: "bg-muted" },
      { token: "muted-foreground", className: "bg-muted-foreground" },
      { token: "border", className: "bg-border" },
      { token: "input", className: "bg-input" },
    ],
  },
  {
    title: "Marca e interacción",
    colors: [
      { token: "primary", className: "bg-primary" },
      { token: "primary-foreground", className: "bg-primary-foreground" },
      { token: "secondary", className: "bg-secondary" },
      { token: "accent", className: "bg-accent" },
      { token: "ring", className: "bg-ring" },
    ],
  },
  {
    title: "Estados",
    colors: [{ token: "destructive", className: "bg-destructive" }],
  },
  {
    title: "Gráficas",
    colors: [
      { token: "chart-1", className: "bg-chart-1" },
      { token: "chart-2", className: "bg-chart-2" },
      { token: "chart-3", className: "bg-chart-3" },
      { token: "chart-4", className: "bg-chart-4" },
      { token: "chart-5", className: "bg-chart-5" },
    ],
  },
];

const typeScale = [
  { name: "4xl · Display", className: "text-4xl font-semibold tracking-tight" },
  { name: "3xl · H1", className: "text-3xl font-semibold tracking-tight" },
  { name: "2xl · H2", className: "text-2xl font-semibold tracking-tight" },
  { name: "xl · H3", className: "text-xl font-semibold" },
  { name: "base · Cuerpo", className: "text-base" },
  { name: "sm · Secundario", className: "text-sm text-muted-foreground" },
  { name: "xs · Etiqueta", className: "text-xs text-muted-foreground" },
];

const radii = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "2xl", className: "rounded-2xl" },
  { name: "3xl", className: "rounded-3xl" },
  { name: "4xl", className: "rounded-4xl" },
  { name: "full", className: "rounded-full" },
];

export function ColorsSection() {
  return (
    <Section
      id="colores"
      title="Colores"
      description="Tokens semánticos definidos en packages/ui/src/styles/globals.css. Usa siempre el token (bg-primary, text-muted-foreground…), nunca colores de la paleta directamente."
    >
      {colorGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {group.title}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {group.colors.map((color) => (
              <div key={color.token} className="space-y-1.5">
                <div
                  className={`h-16 rounded-lg ring-1 ring-foreground/10 ${color.className}`}
                />
                <p className="font-mono text-xs">{color.token}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

export function TypographySection() {
  return (
    <Section
      id="tipografia"
      title="Tipografía"
      description="Geist para la interfaz. Para direcciones, hashes e importes, la fuente monoespaciada del sistema (font-mono)."
    >
      <div className="space-y-4">
        {typeScale.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <span className="w-36 shrink-0 font-mono text-xs text-muted-foreground">
              {item.name}
            </span>
            <span className={item.className}>Tu wallet en Solana</span>
          </div>
        ))}
      </div>
      <Example title="Monoespaciada (font-mono)">
        <div className="space-y-1 font-mono">
          <p className="text-2xl tabular-nums">12.4589 SOL</p>
          <p className="text-sm text-muted-foreground">
            7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
          </p>
        </div>
      </Example>
    </Section>
  );
}

export function RadiusSection() {
  return (
    <Section
      id="radios"
      title="Radios"
      description="Derivados de --radius (0.625rem). Cambia ese valor para ajustar toda la interfaz."
    >
      <div className="flex flex-wrap gap-6">
        {radii.map((radius) => (
          <div key={radius.name} className="space-y-1.5 text-center">
            <div
              className={`size-20 border-2 border-primary bg-primary/10 ${radius.className}`}
            />
            <p className="font-mono text-xs">{radius.name}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
