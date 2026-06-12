import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* EU color palette */
        eu: {
          blue: "#003399",
          "blue-light": "#0044cc",
          gold: "#FFCC00",
          "gold-dark": "#D4A900",
          navy: "#001A4E",
          dark: "#000D3A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["var(--font-garamond)", "Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        premium: "0 4px 6px -1px rgba(0, 51, 153, 0.1), 0 2px 4px -2px rgba(0, 51, 153, 0.06)",
        "premium-lg": "0 10px 25px -5px rgba(0, 51, 153, 0.12), 0 4px 10px -5px rgba(0, 51, 153, 0.06)",
        "premium-xl": "0 20px 40px -10px rgba(0, 51, 153, 0.18)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "flag-float": "flag-float 6s ease-in-out infinite",
        "flag-float-alt": "flag-float-alt 7s ease-in-out infinite",
        "flag-float-slow": "flag-float 9s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
