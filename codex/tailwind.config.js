/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Poppins","'Inter'", "sans-serif"],
      },
      colors: {
        void: {
          950: "#07050c",
          900: "#0b0812",
          800: "#120c1e",
          700: "#181128",
        },
        quint: {
          pink: "#ec4dae",
          magenta: "#c026d3",
          purple: "#8b5cf6",
          indigo: "#6366f1",
          blue: "#38bdf8",
        },
      },
      backgroundImage: {
        "quint-gradient": "linear-gradient(90deg, #7dd3fc 0%, #a78bfa 45%, #f472b6 100%)",
        "quint-gradient-vert": "linear-gradient(180deg, #a78bfa 0%, #ec4dae 100%)",
        "quint-nav": "linear-gradient(90deg, #2a0f4a 0%, #4c1d78 40%, #86198f 75%, #c026d3 100%)",
        "quint-cta": "linear-gradient(90deg, #8b5cf6 0%, #ec4dae 100%)",
        "quint-radial": "radial-gradient(60% 60% at 50% 0%, rgba(139,92,246,0.35) 0%, rgba(7,5,12,0) 70%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(236,77,174,0.25)",
        "card-hover": "0 8px 30px rgba(139,92,246,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
