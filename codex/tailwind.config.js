/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // One typeface across both halves of the site. The Angular site is Poppins
        // throughout, so headings here follow rather than keeping a separate display
        // face - that mismatch was most obvious comparing the two heroes.
        display: ["Poppins", "'Inter'", "sans-serif"],
        body: ["Poppins", "'Inter'", "sans-serif"],
      },
      colors: {
        void: {
          950: "#07050c",
          900: "#0b0812",
          800: "#120c1e",
          700: "#181128",
        },
        // Re-pointed to the site palette rather than renamed, so the many components
        // already using these keep working. Everything here now sits in the 280-310deg
        // violet family sampled from the guild artwork; the old values were blue-violet
        // (#8b5cf6) and sky blue (#38bdf8), which is the blue the Angular side dropped.
        quint: {
          pink: "#ec4dae",      // ember, unchanged
          magenta: "#a8339a",
          purple: "#8b4fb0",    // matches --primary-light
          indigo: "#520f73",    // matches --primary-medium
          blue: "#c9a0dc",      // legacy name; now the orchid accent
        },
      },
      backgroundImage: {
        // Mirrors of the Angular site's --accent-gradient / --btn-gradient.
        "quint-gradient": "linear-gradient(90deg, #c9a0dc 0%, #ec4dae 100%)",
        "quint-gradient-vert": "linear-gradient(180deg, #8b4fb0 0%, #ec4dae 100%)",
        "quint-nav": "linear-gradient(90deg, rgba(11,8,18,0.92) 0%, rgba(82,15,115,0.36) 100%)",
        "quint-cta": "linear-gradient(100deg, #520f73 0%, #6b2d60 100%)",
        // The page-top glow. Was a bright blue-violet at 0.35 across 420px, which read
        // far harder than anything on the home page; now in-family and much fainter.
        "quint-radial": "radial-gradient(60% 60% at 50% 0%, rgba(82,15,115,0.18) 0%, rgba(7,5,12,0) 72%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(236,77,174,0.25)",
        "card-hover": "0 8px 30px rgba(82,15,115,0.30)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
