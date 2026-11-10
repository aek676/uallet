import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";

import { ComponentsSection } from "#components/components-showcase";
import {
  ColorsSection,
  RadiusSection,
  TypographySection,
} from "#components/foundations";

const nav = [
  { href: "#colores", label: "Colores" },
  { href: "#tipografia", label: "Tipografía" },
  { href: "#radios", label: "Radios" },
  { href: "#componentes", label: "Componentes" },
];

export function App() {
  return (
    <ThemeProvider>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <span className="font-semibold">Uallet · Guía de estilo</span>
          <nav className="hidden gap-4 text-sm text-muted-foreground sm:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-16 px-6 py-12">
        <ColorsSection />
        <TypographySection />
        <RadiusSection />
        <ComponentsSection />
      </main>
      <Toaster />
    </ThemeProvider>
  );
}
