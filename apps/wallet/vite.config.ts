import tailwindcss from "@tailwindcss/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [varlockVitePlugin(), react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
});
