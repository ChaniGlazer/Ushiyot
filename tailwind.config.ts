import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Tailwind v4 is CSS-first (see @theme in app/globals.css for the color/design-token
// mapping) - this file only carries what's still cleaner to express in JS: the font
// stacks (wired to the next/font CSS variables set up in app/layout.tsx) and the
// shadcn/ui-standard animate plugin used by its component primitives.
const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-ibm-plex-sans-hebrew)", "system-ui", "sans-serif"],
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
        label: ["var(--font-rubik)", "system-ui", "sans-serif"],
      },
      // Used by SparkLoadingExperience (components/ui/SparkLoadingExperience.tsx) - a slow,
      // calm shimmer sweep for the skeleton cards, and a short rise-and-fade for the energy
      // icon's particle burst.
      keyframes: {
        "spark-shimmer": {
          "0%": { backgroundPosition: "150% 0" },
          "100%": { backgroundPosition: "-150% 0" },
        },
        "spark-particle-rise": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-2.5rem) scale(0.4)", opacity: "0" },
        },
      },
      animation: {
        "spark-shimmer": "spark-shimmer 3.2s ease-in-out infinite",
        "spark-particle-rise": "spark-particle-rise 0.9s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
