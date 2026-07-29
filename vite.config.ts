import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static brand assets (logo, screenshots, etc.) live in the top-level
// `assets/` folder. Anything dropped in there is served from the site root,
// e.g. `assets/logo.png` -> `/logo.png`.
export default defineConfig({
  plugins: [react()],
  publicDir: "assets",
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
