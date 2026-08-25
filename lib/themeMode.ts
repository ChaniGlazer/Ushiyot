import type { DailyHebcalInfo } from "./hebcal";

export type ThemeMode = "normal" | "shabbat" | "holiday" | "solemn";

// Hebcal's REST API doesn't expose a dedicated "fast day" category - every notable date
// (holidays, fasts, Erev-days, "Shabbat X" labels) comes back as category "holiday". Title
// matching against the known fast/memorial days is the only reliable signal available.
// Curly ("’") vs straight apostrophe varies by title, hence the "." wildcard.
const SOLEMN_TITLE_PATTERN =
  /Tzom|Ta.anit|Tish.a B.Av|Asara B.Tevet|Yom Kippur|Yom HaShoah|Yom HaZikaron/i;

const SHABBAT_LOOKAHEAD_MS = 2 * 60 * 60 * 1000; // brief: shabbat mode from 2h before candle-lighting

export function computeThemeMode(dailyInfo: DailyHebcalInfo, now: Date = new Date()): ThemeMode {
  // Solemn takes precedence over holiday - Yom Kippur is technically both a Yom Tov and the
  // most solemn fast of the year; the Deep Emerald "holiday" mode would misrepresent it.
  if (dailyInfo.events.some((e) => SOLEMN_TITLE_PATTERN.test(e.title))) {
    return "solemn";
  }

  if (dailyInfo.events.some((e) => e.yomtov)) {
    return "holiday";
  }

  const { candleLighting, havdalah } = dailyInfo.shabbat;
  if (candleLighting && havdalah) {
    const nowMs = now.getTime();
    const shabbatStart = new Date(candleLighting).getTime() - SHABBAT_LOOKAHEAD_MS;
    const shabbatEnd = new Date(havdalah).getTime();
    if (nowMs >= shabbatStart && nowMs < shabbatEnd) {
      return "shabbat";
    }
  }

  return "normal";
}
