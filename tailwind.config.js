/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
    },
    colors: {
      primary: "#00D4FF",
      secondary: "#0B1E3F",
      danger: "#FF5252",
      warning: "#FF8C00",
      success: "#00C853",
      info: "#7C4DFF",
    },
    fontFamily: {
      display: ["Orbitron", "sans-serif"],
      mono: ["Roboto Mono", "monospace"],
    },
    extend: {
      colors: {
        glass: "rgba(255, 255, 255, 0.1)",
        "glass-90": "rgba(255, 255, 255, 0.9)",
        "glass-80": "rgba(255, 255, 255, 0.8)",
        "glass-70": "rgba(255, 255, 255, 0.7)",
        "dark-bg": "#061529",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        marquee: "marquee 20s linear infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 5px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 20px rgba(0, 212, 255, 0.8), 0 0 40px rgba(0, 212, 255, 0.5)",
          },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};
