import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static brand assets (logo, screenshots, etc.) live in the top-level
// `assets/` folder. Anything dropped in there is served from the site's base,
// e.g. `assets/logo.png` -> `/guides/logo.png` — reference it in code via
// `publicAsset("/logo.png")`, never as a bare `/logo.png` string.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: "/guides/",
  publicDir: "assets",
  build: {
    outDir: "dist/guides",
    emptyOutDir: true,
  },
  // shared/navbar.css lives one level above this project, so the dev server has to
  // be allowed to read outside the root. The production build inlines it regardless.
  server: {
    fs: { allow: [".", ".."] },
    // In production one nginx serves the Codex and proxies /api to the .NET API, so
    // these are same-origin calls. The dev server is a separate origin, so it proxies
    // them the same way instead - which also means dev talks to the real API rather
    // than a mock that can drift from it.
    proxy: {
      "/api": { target: "https://localhost:5101", changeOrigin: true, secure: false },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
}));
