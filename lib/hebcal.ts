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

function toIsraelDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
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

// Hebcal's /shabbat endpoint always returns the upcoming Friday/Saturday's info,
// regardless of which date it's queried with - it does not scope by day on its own.
// Parasha/candle-lighting/havdalah are only relevant once that Shabbat is close, so
// they're hidden outside Thursday-Saturday.
function isShabbatWindow(gregorianDate: string): boolean {
  const day = new Date(`${gregorianDate}T12:00:00`).getDay(); // 0=Sun ... 6=Sat
  return day >= 4; // Thu, Fri, Sat
}

// Cached per Israel-calendar-day so middleware doesn't call Hebcal on every request -
// candle-lighting/havdalah for "today" don't change within the same day.
let cachedShabbatWindow: { forDate: string; candleLighting: number | null; havdalah: number | null } | null = null;

async function getShabbatWindow(gregorianDate: string): Promise<{ candleLighting: number | null; havdalah: number | null }> {
  if (cachedShabbatWindow?.forDate === gregorianDate) {
    return cachedShabbatWindow;
  }
  const shabbat = await getShabbatTimes(gregorianDate);
  cachedShabbatWindow = {
    forDate: gregorianDate,
    candleLighting: shabbat.candleLighting ? new Date(shabbat.candleLighting).getTime() : null,
    havdalah: shabbat.havdalah ? new Date(shabbat.havdalah).getTime() : null,
  };
  return cachedShabbatWindow;
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
