import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

const plugins = [
  { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
];

/**
 * TanStack Devtools with a tab per library. Dev only: the root route imports
 * it lazily behind `import.meta.env.DEV`, so it isn't in the build.
 */
export function Devtools() {
  return <TanStackDevtools plugins={plugins} />;
}
