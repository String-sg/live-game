import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        accent: "var(--accent)",
        muted: "var(--muted)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        error: "var(--error)",
        success: "var(--success)",
        warn: "var(--warn)",
        buyer: "var(--buyer)",
        seller: "var(--seller)",
      },
    },
  },
  plugins: [],
};
export default config;
