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
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
