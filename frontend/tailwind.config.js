/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: "#0B0F17",
          panel: "#111827",
          border: "#1F2937",
          card: "#161F30",
        },
        brand: {
          cyan: "#00F0FF",
          purple: "#A855F7",
          blue: "#3B82F6",
          emerald: "#10B981",
          rose: "#F43F5E",
          amber: "#F59E0B"
        }
      }
    },
  },
  plugins: [],
}

