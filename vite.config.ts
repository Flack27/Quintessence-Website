import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static brand assets (logo, screenshots, etc.) live in the top-level
// `assets/` folder. Anything dropped in there is served from the site's base,
// e.g. `assets/logo.png` -> `/guides/logo.png` — reference it in code via
// `publicAsset("/logo.png")`, never as a bare `/logo.png` string.
export default defineConfig({
  plugins: [react()],
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
});
