import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand-primary) / <alpha-value>)",
          primary: "rgb(var(--brand-primary) / <alpha-value>)",
          secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
          light: "rgb(var(--brand-light) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        topbar: "rgb(var(--top-bar) / <alpha-value>)",
        body: "rgb(var(--body-bg) / <alpha-value>)",
        card: "rgb(var(--card-bg) / <alpha-value>)",
        ek: {
          text: "rgb(var(--text) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          border: "rgb(var(--border) / <alpha-value>)",
          success: "rgb(var(--success) / <alpha-value>)",
          warning: "rgb(var(--warning) / <alpha-value>)",
          danger: "rgb(var(--danger) / <alpha-value>)",
        },
      },
      boxShadow: {
        card: "0 2px 5px 0 rgba(0,0,0,0.15)",
        elevated: "0 6px 24px 0 rgba(0,0,0,0.10)",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
