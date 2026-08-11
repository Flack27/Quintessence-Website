import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApiPlugin } from "./dev/mock-api";

// Static brand assets (logo, screenshots, etc.) live in the top-level
// `assets/` folder. Anything dropped in there is served from the site's base,
// e.g. `assets/logo.png` -> `/guides/logo.png` — reference it in code via
// `publicAsset("/logo.png")`, never as a bare `/logo.png` string.
export default defineConfig(({ command }) => ({
  // mockApiPlugin only runs under `vite`/`npm run dev` (command === "serve"), never in a
  // production build — see dev/mock-api.ts for what it fakes and why.
  plugins: [react(), command === "serve" && mockApiPlugin()],
  base: "/guides/",
  publicDir: "assets",
  build: {
    outDir: "dist/guides",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
}));
