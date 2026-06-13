import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Product Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // shadcn semantic tokens (mapped to Atourin in globals.css)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Atourin brand palette (direct hex)
        atr: {
          purple: {
            DEFAULT: "#7068D5",
            soft: "#A49EE4",
            light: "#CDCDED",
            50: "#F1F0FB",
            600: "#6564AB",
            700: "#574BAE",
            800: "#654093",
          },
          yellow: "#FFC442",
          red: "#F46263",
          arti: "#51B054",
          fg: {
            DEFAULT: "#58595B",
            muted: "#8A8B8D",
          },
          bg: {
            DEFAULT: "#FFFFFF",
            soft: "#F6F6FB",
            cool: "#E4E6F3",
          },
          outline: "#E6E6E6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "9999px",
      },
      boxShadow: {
        "atr-1":
          "0 1px 2px rgba(0,0,0,0.05), 0 1px 1px rgba(0,0,0,0.04)",
        "atr-2":
          "0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "atr-4":
          "0 6px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
      },
      backgroundImage: {
        "atr-purple-gradient":
          "linear-gradient(135deg, #7E76DD 0%, #6964C9 45%, #574BAE 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
