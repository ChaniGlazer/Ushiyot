"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DailyHebcalInfo } from "@/lib/hebcal";
import { computeThemeMode, type ThemeMode } from "@/lib/themeMode";

const THEME_CLASSES: Record<Exclude<ThemeMode, "normal">, string> = {
  shabbat: "theme-shabbat",
  holiday: "theme-holiday",
  solemn: "theme-solemn",
};

const ThemeModeContext = createContext<ThemeMode>("normal");

/** Current dynamic theme mode (shabbat/holiday/solemn/normal) - for components that need to
 * know it (e.g. an icon or label), not for driving the visual palette itself (that's the
 * root class + CSS overrides in tokens.css, applied independently of React re-renders). */
export function useThemeMode(): ThemeMode {
  return useContext(ThemeModeContext);
}

type Props = {
  dailyInfo: DailyHebcalInfo;
  children: ReactNode;
};

export default function ThemeProvider({ dailyInfo, children }: Props) {
  // Starts at "normal" rather than computing from `new Date()` during render - the server and
  // client clocks/render timing can differ by enough to flip a boundary check, and this value
  // never drives SSR'd markup directly (only the effect below touches the DOM), so there's no
  // benefit to computing it before mount - only hydration-mismatch risk to avoid.
  const [mode, setMode] = useState<ThemeMode>("normal");

  useEffect(() => {
    function applyMode(next: ThemeMode) {
      const root = document.documentElement;
      for (const cls of Object.values(THEME_CLASSES)) root.classList.remove(cls);
      if (next !== "normal") root.classList.add(THEME_CLASSES[next]);
    }

    function tick() {
      const next = computeThemeMode(dailyInfo);
      applyMode(next);
      setMode((prev) => (prev === next ? prev : next));
    }

    tick();
    // Cheap re-check on a timer (crossing into/out of the Shabbat window while the tab stays
    // open) and whenever the tab regains focus (catches long-backgrounded tabs immediately
    // instead of waiting up to a minute) - never re-fetches Hebcal data, just re-evaluates the
    // same dailyInfo against the current time.
    const interval = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      applyMode("normal");
    };
  }, [dailyInfo]);

  return <ThemeModeContext.Provider value={mode}>{children}</ThemeModeContext.Provider>;
}
