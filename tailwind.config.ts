import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Fix 67: Dark mode via class
  darkMode: "class",
  theme: {
    extend: {
      // Fix 84: Proper color tokens matching globals.css
      colors: {
        vivit: {
          primary:   "#0077B6",
          dark:      "#023E8A",
          cyan:      "#00B4D8",
          bg:        "#0B1220",
          card:      "#0D1A2E",
          sidebar:   "#071020",
          border:    "rgba(0,119,182,0.14)",
          text:      "#D4E4F0",
          muted:     "#5A80A0",
          dim:       "#3A5A7A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up":  "fadeUp 0.2s ease-out",
        "fade-in":  "fadeIn 0.2s ease-out",
        "shimmer":  "shimmer 1.5s infinite",
        "ping-slow":"ping 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeUp:  { from: { opacity:"0", transform:"translateY(8px)" }, to: { opacity:"1", transform:"translateY(0)" } },
        fadeIn:  { from: { opacity:"0" }, to: { opacity:"1" } },
        shimmer: { "0%,100%": { backgroundPosition:"200% center" }, "50%": { backgroundPosition:"-200% center" } },
      },
      borderRadius: {
        "vivit": "12px",
      },
    },
  },
  plugins: [],
};

export default config;
