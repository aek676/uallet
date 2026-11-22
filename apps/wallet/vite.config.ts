import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { ENV } from "varlock/env";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    varlockVitePlugin(),
    paraglideVitePlugin({ project: "../../packages/i18n/project.inlang" }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/route-tree.gen.ts",
      quoteStyle: "double",
      semicolons: true,
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: [".opentunnel.xyz"],
    proxy: {
      "/api": {
        target: `http://localhost:${ENV.API_PORT}`,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
