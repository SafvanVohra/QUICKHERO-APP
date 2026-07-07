import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Plain client-side SPA build — no TanStack Start / Nitro / SSR.
// The TanStack Router vite plugin auto-generates src/routeTree.gen.ts
// from the file-based routes in src/routes on every dev/build run.
export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
