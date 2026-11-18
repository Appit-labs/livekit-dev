import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        border: "var(--color-outline-variant)",
        input: "var(--color-outline-variant)",
        ring: "var(--color-primary)",
        background: "var(--color-surface)",
        foreground: "var(--color-on-surface)",
        primary: {
          DEFAULT: "var(--color-primary)",
          container: "var(--color-primary-container)",
          foreground: "var(--color-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          container: "var(--color-secondary-container)",
          foreground: "var(--color-on-primary)",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary)",
          container: "var(--color-tertiary-container)",
        },
        destructive: {
          DEFAULT: "var(--color-error)",
          container: "var(--color-error-container)",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "var(--color-surface-container-low)",
          foreground: "var(--color-on-surface-variant)",
        },
        accent: {
          DEFAULT: "var(--color-surface-container-high)",
          foreground: "var(--color-on-surface)",
          teal: "var(--color-accent-teal)",
          green: "var(--color-accent-green)",
          amber: "var(--color-accent-amber)",
          purple: "var(--color-accent-purple)",
        },
        popover: {
          DEFAULT: "var(--color-surface-container-lowest)",
          foreground: "var(--color-on-surface)",
        },
        card: {
          DEFAULT: "var(--color-surface-container-lowest)",
          foreground: "var(--color-on-surface)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          lowest: "var(--color-surface-container-lowest)",
          low: "var(--color-surface-container-low)",
          container: "var(--color-surface-container)",
          high: "var(--color-surface-container-high)",
          highest: "var(--color-surface-container-highest)",
        },
        outline: {
          DEFAULT: "var(--color-outline)",
          variant: "var(--color-outline-variant)",
        },
        sidebar: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-on-primary)",
          primary: "var(--color-primary-container)",
          "primary-foreground": "var(--color-on-primary)",
          accent: "rgba(255, 255, 255, 0.1)",
          "accent-foreground": "var(--color-on-primary)",
          border: "rgba(255, 255, 255, 0.15)",
          ring: "var(--color-accent-teal)",
          muted: "rgba(255, 255, 255, 0.6)",
        },
        success: "var(--color-accent-green)",
        warning: "var(--color-accent-amber)",
        online: "var(--color-accent-green)",
        away: "var(--color-accent-amber)",
        busy: "var(--color-error)",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm: "0.0625rem",
        md: "0.375rem",
        lg: "0.25rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        ambient: "0 12px 32px -4px rgba(25, 28, 30, 0.06)",
        "ambient-lg": "0 16px 48px -8px rgba(25, 28, 30, 0.08)",
        ghost: "0 0 0 1px rgba(194, 198, 209, 0.15)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "slide-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-gentle": "pulse-gentle 2s ease-in-out infinite",
        "slide-in": "slide-in 0.25s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
