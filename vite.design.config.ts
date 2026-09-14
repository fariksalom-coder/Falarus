import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Independent frontend preview: no backend, credentials, or application providers.
export default defineConfig({
  envDir: false,
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  build: { outDir: "dist-design", rollupOptions: { input: "design.html" } },
});
