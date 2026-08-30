const HEBCAL_BASE = "https://www.hebcal.com";

// Jerusalem, used as the default location for candle-lighting/havdalah times
// and to anchor the Israeli (single-day Yom Tov) holiday scheme.
const DEFAULT_GEONAME_ID = process.env.HEBCAL_GEONAME_ID || "281184";

export type HebrewDate = {
  day: number;
  month: string;
  year: number;
  formatted: string;
};

export type HebcalEvent = {
  title: string;
  category: string;
  hebrew?: string;
  memo?: string;
  /** True for Yom Tov days (melacha forbidden) - used by lib/themeMode.ts's holiday mode. */
  yomtov?: boolean;
};

export type ShabbatTimes = {
  parasha: string | null;
  candleLighting: string | null;
  havdalah: string | null;
};

export type DailyHebcalInfo = {
  gregorianDate: string;
  hebrewDate: HebrewDate;
  events: HebcalEvent[];
  shabbat: ShabbatTimes;
  /**
   * Hebcal's public REST API has no general-purpose feed of tzadikim
   * hillula dates (only a personalized Yahrzeit API seeded with dates a
   * user submits themselves). Left empty rather than invented.
   */
  hillulot: HebcalEvent[];
};

// Exported so callers that need a best-effort "today" (e.g. a fallback when the real Hebcal
// call fails - see getFallbackDailyInfo) can compute it without another network round-trip.
export function toIsraelDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Hebcal is a free, unauthenticated third-party API with no SLA - a timeout keeps a slow
// response from hanging the caller indefinitely (a bare fetch() has no default timeout), so
// failures surface quickly enough for callers' fail-open/fallback handling to actually kick in.
const HEBCAL_TIMEOUT_MS = 5000;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(HEBCAL_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Hebcal request failed (${response.status}): ${url}`);
  }
  return response.json() as Promise<T>;
}

type ConverterResponse = {
  hy: number;
  hm: string;
  hd: number;
  hebrew: string;
};

async function getHebrewDate(gregorianDate: string): Promise<HebrewDate> {
  const url = `${HEBCAL_BASE}/converter?cfg=json&date=${gregorianDate}&g2h=1`;
  const data = await fetchJson<ConverterResponse>(url);

  return {
    day: data.hd,
    month: data.hm,
    year: data.hy,
    formatted: data.hebrew,
  };
}

type HebcalItem = {
  title: string;
  category: string;
  date: string;
  hebrew?: string;
  memo?: string;
  /** Present on holiday items; true for days melacha is forbidden (Israel single-day scheme). */
  yomtov?: boolean;
};

type HebcalResponse = {
  items?: HebcalItem[];
};

async function getDayEvents(gregorianDate: string): Promise<HebcalEvent[]> {
  const url =
    `${HEBCAL_BASE}/hebcal?v=1&cfg=json&start=${gregorianDate}&end=${gregorianDate}` +
    `&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&il=on`;
  const data = await fetchJson<HebcalResponse>(url);

  return (data.items ?? []).map((item) => ({
    title: item.title,
    category: item.category,
    hebrew: item.hebrew,
    memo: item.memo,
    yomtov: item.yomtov,
  }));
}

async function getShabbatTimes(gregorianDate: string): Promise<ShabbatTimes> {
  const [gy, gm, gd] = gregorianDate.split("-");
  const url =
    `${HEBCAL_BASE}/shabbat?cfg=json&geonameid=${DEFAULT_GEONAME_ID}&M=on&b=18` +
    `&gy=${gy}&gm=${gm}&gd=${gd}`;
  const data = await fetchJson<HebcalResponse>(url);
  const items = data.items ?? [];

  const candle = items.find((item) => item.category === "candles");
  const havdalah = items.find((item) => item.category === "havdalah");
  const parasha = items.find((item) => item.category === "parashat");

  return {
    parasha: parasha?.hebrew ?? parasha?.title ?? null,
    candleLighting: candle?.date ?? null,
    havdalah: havdalah?.date ?? null,
  };
}

// Pure UTC arithmetic (noon, to stay clear of any DST edge) - avoids any dependence on the
// server process's local timezone, matching the same pattern lib/streak.ts's own addDays uses.
// A bare `new Date(dateStr + "T12:00:00")` parses in the server's local zone instead, which only
// happens to give the right weekday/date today because Render's Node runtime defaults to UTC -
// it would silently misbehave if that ever changed (different host/platform, TZ env var set).
function dayOfWeekUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=Sun ... 6=Sat
}

// Hebcal's /shabbat endpoint always returns the upcoming Friday/Saturday's info,
// regardless of which date it's queried with - it does not scope by day on its own.
// Parasha/candle-lighting/havdalah are only relevant once that Shabbat is close, so
// they're hidden outside Thursday-Saturday.
function isShabbatWindow(gregorianDate: string): boolean {
  return dayOfWeekUtc(gregorianDate) >= 4; // Thu, Fri, Sat
}

// Cached per Israel-calendar-day so middleware doesn't call Hebcal on every request -
// candle-lighting/havdalah for "today" don't change within the same day.
let cachedShabbatWindow: { forDate: string; candleLighting: number | null; havdalah: number | null } | null = null;

// The in-flight *promise* itself (not just the resolved value) is cached too, keyed by date -
// on a cache miss, every request that lands before the first fetch resolves (e.g. a burst of
// page loads right as the Israel-calendar day rolls over, since middleware runs this on every
// page request) awaits the SAME underlying Hebcal call instead of each firing its own redundant
// one. Cleared once settled (success or failure) so a failed fetch doesn't get stuck cached and
// a later call retries normally.
let inFlightShabbatWindow: {
  forDate: string;
  promise: Promise<{ candleLighting: number | null; havdalah: number | null }>;
} | null = null;

async function getShabbatWindow(gregorianDate: string): Promise<{ candleLighting: number | null; havdalah: number | null }> {
  if (cachedShabbatWindow?.forDate === gregorianDate) {
    return cachedShabbatWindow;
  }

  if (inFlightShabbatWindow?.forDate === gregorianDate) {
    return inFlightShabbatWindow.promise;
  }

  const promise = (async () => {
    const shabbat = await getShabbatTimes(gregorianDate);
    const result = {
      forDate: gregorianDate,
      candleLighting: shabbat.candleLighting ? new Date(shabbat.candleLighting).getTime() : null,
      havdalah: shabbat.havdalah ? new Date(shabbat.havdalah).getTime() : null,
    };
    cachedShabbatWindow = result;
    return result;
  })();

  inFlightShabbatWindow = { forDate: gregorianDate, promise };

  try {
    return await promise;
  } finally {
    if (inFlightShabbatWindow?.forDate === gregorianDate) {
      inFlightShabbatWindow = null;
    }
  }
}

// Whether it's currently between candle-lighting and havdalah for the current/upcoming
// Shabbat, using the exact same Hebcal-sourced times as the dashboard's Shabbat display.
export async function isShabbatNow(now: Date = new Date()): Promise<boolean> {
  const todayIso = toIsraelDateString(now);
  const { candleLighting, havdalah } = await getShabbatWindow(todayIso);
  if (candleLighting === null || havdalah === null) return false;
  const nowMs = now.getTime();
  return nowMs >= candleLighting && nowMs < havdalah;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toIsraelDateString(new Date(Date.UTC(y, m - 1, d + days, 12)));
}

/**
 * Every date in [startDate, endDate] (inclusive) that's a Shabbat (Saturday) or a Yom Tov
 * holiday per Hebcal's Israel single-day scheme - used by lib/streak.ts to tell an actual
 * missed day apart from a Shabbat/chag the app should never have expected a visit on.
 */
export async function getRestDaysInRange(startDate: string, endDate: string): Promise<Set<string>> {
  const restDays = new Set<string>();

  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    if (dayOfWeekUtc(d) === 6) restDays.add(d);
  }

  const url =
    `${HEBCAL_BASE}/hebcal?v=1&cfg=json&start=${startDate}&end=${endDate}` +
    `&maj=on&min=off&mod=off&nx=off&mf=off&ss=off&il=on`;
  const data = await fetchJson<HebcalResponse>(url);

  for (const item of data.items ?? []) {
    if (item.yomtov) restDays.add(item.date.slice(0, 10));
  }

  return restDays;
}

// A safe, locally-computable stand-in for getDailyInfo() when the real Hebcal call fails -
// used by app/dashboard/page.tsx so a Hebcal outage degrades to "no Hebrew date/events/Shabbat
// info shown today" instead of crashing the dashboard. gregorianDate is still accurate (pure
// timezone math, no network call); everything Hebcal itself would have supplied is empty.
export function getFallbackDailyInfo(date: Date = new Date()): DailyHebcalInfo {
  return {
    gregorianDate: toIsraelDateString(date),
    hebrewDate: { day: 0, month: "", year: 0, formatted: "" },
    events: [],
    shabbat: { parasha: null, candleLighting: null, havdalah: null },
    hillulot: [],
  };
}

export async function getDailyInfo(date: Date = new Date()): Promise<DailyHebcalInfo> {
  const gregorianDate = toIsraelDateString(date);

  const [hebrewDate, events, shabbatRaw] = await Promise.all([
    getHebrewDate(gregorianDate),
    getDayEvents(gregorianDate),
    getShabbatTimes(gregorianDate),
  ]);

  const shabbat: ShabbatTimes = isShabbatWindow(gregorianDate)
    ? shabbatRaw
    : { parasha: null, candleLighting: null, havdalah: null };

  return {
    gregorianDate,
    hebrewDate,
    events,
    shabbat,
    hillulot: [],
  };
}
