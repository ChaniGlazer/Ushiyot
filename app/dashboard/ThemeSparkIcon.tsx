"use client";

import { useThemeMode } from "./ThemeProvider";
import styles from "./dashboard.module.css";

/**
 * Small spark glyph next to the Hebcal context card's date - spins slowly and continuously
 * only while the dynamic theme is "shabbat" (see ThemeProvider/lib/themeMode.ts), otherwise
 * sits still. Reading the mode via context (not the class on <html>) keeps this in sync with
 * the same 60s/visibility-change re-checks the provider already does, no extra polling here.
 */
export default function ThemeSparkIcon() {
  const mode = useThemeMode();

  return (
    <span
      className={`${styles.contextSpark} ${mode === "shabbat" ? styles.contextSparkSpin : ""}`}
      aria-hidden="true"
    >
      ✨
    </span>
  );
}
