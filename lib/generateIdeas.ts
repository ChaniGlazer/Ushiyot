import type { CreatorProfile } from "./creators";
import type { DailyHebcalInfo } from "./hebcal";
import { recordIdeasShown } from "./ideaHistory";
import { getRecentContext } from "./getRecentContext";
import { DEFAULT_IDEA_COUNT, OPENAI_MODEL } from "./config";
import { computeActualCostUsd, estimateCallCostUsd } from "./costEstimate";
import { DAILY_LIMIT_MESSAGE, recordApiUsage, wouldExceedDailyLimit } from "./apiUsage";
import { getActiveEventsForSector, type CurrentEventRow } from "./currentEvents";

export type ContentIdea = {
  id: number;
  title: string;
  description: string;
  type: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export { DEFAULT_IDEA_COUNT };

/** Tune here: how often an active current-event is offered as optional context (not forced). */
const CURRENT_EVENT_INCLUSION_PROBABILITY = 0.28;

const ANTI_CLICHE_EXAMPLES = [
  {
    bad: "'הזמן לתפילת שחרית - חשיבות התחלת היום נכון' - סטריאוטיפ מגזרי גנרי, לא קשור לשום פרט אמיתי מהפרופיל של היוצר הזה.",
    good: "רעיון שמבוסס על הנישה או הפרט האישי הממשי שסופק בפרופיל של היוצר הספציפי הזה, גם אם הוא לא 'קלאסי' למגזר.",
  },
  {
    bad: "'תמונה מבית שמש/בני ברק עם כיתוב כללי על החיים בעיר' - אזכור עיר רק כי היא 'אופיינית' למגזר, לא כי היא סופקה בפועל.",
    good: "אם עיר מגורים סופקה בפועל בפרופיל - שילוב שלה בהקשר קונקרטי וממשי (לא כללי), ואם לא סופקה - לא להזכיר עיר בכלל.",
  },
  {
    bad: "'טיפים כלליים לניהול זמן' - בלי שום חיבור לניסיון האישי או לנישה המדויקת של היוצר.",
    good: "רעיון שמנוסח מנקודת המבט הספציפית והניסיון בפועל של היוצר הזה, עם פרט קונקרטי מהפרופיל שסופק.",
  },
  {
    bad: "'טיפ להורות בהשראת 3 הילדים ועיר המגורים שלכם' - הפרטים האישיים מוטמעים בכוח כדי 'להוכיח' היכרות עם הפרופיל, במקום לשמש רקע בלבד.",
    good: "רעיון שבו הפרטים האישיים לא מוזכרים כלל בתוכן המפורש - הם באים לידי ביטוי רק בטון, בקצב ובזווית שנבחרה, בדיוק כמו שחבר שמכיר אותך היטב יבחר איך לדבר איתך בלי לצטט בחזרה עובדות עליך.",
  },
];

function buildSystemPrompt(sector: string | null, gender: string | null): string {
  const examples = ANTI_CLICHE_EXAMPLES.map(
    (ex, i) => `${i + 1}. קלישאתי: ${ex.bad}\n   טוב: ${ex.good}`,
  ).join("\n");

  const religiousEmphasisNote =
    sector === "חילוני"
      ? "היוצר/ת הזה/ו ממגזר חילוני - אל תדגישו תוכן דתי-תורני (כמו פרשת השבוע או ניסוח דתי) כמקור מרכזי לרעיונות. נגיעה קלה מאוד ואגבית מותרת לכל היותר ברעיון אחד אם היא משתלבת בטבעיות מוחלטת, אך רוב הרעיונות לא אמורים לגעת בזה בכלל. חגים יהודיים בפועל (ראש השנה, פסח וכו') הם עדיין אירועים תרבותיים לגיטימיים לכל מגזר, זה נוגע רק לניסוח דתי-תורני מודגש כמו פרשת השבוע."
      : "אירועי לוח השנה והקשר היהודי-תורני (כולל פרשת השבוע כשהיא מסופקת) הם מקור לגיטימי ומלא לרעיונות, בהתאם למגזר ולטון של היוצר.";

  const genderNote =
    gender === "בן" || gender === "בת"
      ? `מגדר היוצר/ת: ${gender}. בכל מקום שבו רעיון פונה ליוצר/ת ישירות או מנוסח בגוף שמתאר אותו/ה (למשל כותרת שממוענת אליו/ה, או ניסוח שמניח שהיוצר/ת עצמו/ה יכתוב/תכתוב את הפוסט), השתמשו בהטיות דקדוקיות בעברית שמתאימות למגדר הזה (${gender === "בן" ? "לשון זכר" : "לשון נקבה"}) במקום בלשון סתמית/רבים.`
      : null;

  return [
    "אתה עוזר תוכן שמייצר רעיונות תוכן קונקרטיים ליוצרי תוכן ואושיות רשת ברשתות החברתיות.",
    "אתה יודע רק את מה שסופק לך בהודעת המשתמש בקונטקסט - אסור לך להמציא תאריכים, אירועים, חגים, פרשות שבוע או כל עובדה שלא נמסרה לך במפורש. אם לא צוין אירוע מיוחד היום, אל תמציא אחד ואל תתייחס לתאריך כמיוחד.",
    "כל הרעיונות המיוצרים חייבים להתייחס אך ורק לתאריך המדויק שסופק כ'היום' בהודעת המשתמש - לעולם לא למחר ולא לתאריך עתידי אחר, גם אם מופיעים בנתונים תאריכים עתידיים (כמו זמני כניסת שבת שיכולים לחול בעוד כמה ימים).",
    "אל תשתמש בברירת המחדל הראשונה שעולה לך בקשר למגזר או לנישה של היוצר. לדוגמה, עבור מגזר חרדי - הימנע אוטומטית מהתייחסות גנרית לתפילה, שבת, או ערים כמו בית שמש/בני ברק, אלא אם יש להן קשר ישיר ומדויק לפרטים שסופקו בפועל על היוצר הספציפי הזה. המגזר הוא מסגרת תרבותית לטון ולשפה בלבד - לא מקור לתוכן.",
    religiousEmphasisNote,
    genderNote,
    "מה שהופך רעיון לספציפי ולא-קלישאתי הוא בעיקר הנישה/התחום המקצועי המדויק של היוצר, בשילוב הקשר לוח השנה האמיתי של היום - זה מה שצריך להניע את רוב הרעיונות.",
    "הפרטים האישיים על היוצר (מספר ילדים, עיר מגורים, מצב משפחתי וכו') הם כדי שתכיר את היוצר ותבין את נקודת המבט, קצב החיים והשלב בחיים שלו - לא מרכיבים שחייבים להופיע בתוכן. אל תשלב אותם ישירות ברעיון אלא אם זה נובע בטבעיות מהרעיון עצמו, לא בכפייה. רוב הרעיונות לא יזכירו את הפרטים האישיים בכלל - הם ישפיעו על הטון ועל בחירת הזוויות, לא על התוכן המפורש. יחד עם זאת, זה גם לא צריך להיות אף פעם - אם ממש עולה בטבעיות רעיון אחד טוב שבו פרט אמיתי משתלב בלי מאמץ, מותר ואף רצוי לכלול אותו; המטרה היא איפוק, לא הימנעות מוחלטת.",
    `דוגמאות להבדל בין רעיון קלישאתי לרעיון טוב (להמחשה בלבד - אל תעתיק את הדוגמאות עצמן):\n${examples}`,
    "כל רעיון חייב להיות בעל נושא וזווית מרכזית שונים בבירור מהרעיונות האחרים שאתה מייצר באותה בקשה - לא רק ניסוח שונה לאותו רעיון.",
    "בהודעת המשתמש יופיע גם סיכום קצר של היסטוריית התוכן של היוצר הזה. השתמש בו כדי לא לחזור על אותן זוויות/סוגים ששלטו לאחרונה, לתת עדיפות מסוימת לסוגים שסומנו כעובדים טוב בעבר, ולהימנע מכיוון דומה לרעיונות שנדחו לאחרונה - אך בלי לצטט את הסיכום עצמו בתוך הרעיונות.",
    "אם היוצר/ת סיפק/ה כיוון מבוקש להיום, התייחסו אליו כהשראה רכה בלבד - לא כהוראה נוקשה. אין חובה שכל רעיון (או אפילו רעיון אחד) יתייחס אליו; אם הוא לא מתחבר בטבעיות לחלק מהרעיונות, פשוט התעלמו ממנו שם. עדיף רעיון טוב שלא קשור לכיוון מאשר רעיון מאולץ.",
    "אם סופק לך אירוע תקופה (חדשות/אקטואליה), אתה יכול (לא חייב) לשלב אותו כזווית לאחד הרעיונות אם זה מתאים באופן טבעי - אל תכפה את זה. גם אם הוא מתאים, אסור בשום מקרה לתת יותר מרעיון אחד מתוך הכמות המבוקשת שמבוסס על אירוע התקופה - שאר הרעיונות חייבים לנבוע ממקורות אחרים.",
    '"סוג הרעיון" הוא שדה פתוח (לדוגמה: פוסט, שאלה, תזכורת, סדרה, או כל סוג אחר מתאים) - בחר את הסוג המתאים ביותר לכל רעיון בנפרד.',
    "השב אך ורק בעברית תקנית, ואך ורק בפורמט JSON חוקי בהתאם למבנה שיתבקש במפורש.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 0=Sunday ... 6=Saturday, computed from the Y-M-D calendar date only (timezone-independent). */
function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

function buildUserPrompt(
  profile: CreatorProfile,
  dailyInfo: DailyHebcalInfo,
  count: number,
  hint: string | null,
  currentEvent: CurrentEventRow | null,
): string {
  const personalFactsList = [
    profile.childrenCount !== null ? `מספר ילדים: ${profile.childrenCount}` : null,
    profile.city ? `עיר מגורים: ${profile.city}` : null,
    profile.familyStatus ? `מצב משפחתי: ${profile.familyStatus}` : null,
  ].filter(Boolean);
  const personalBlock =
    personalFactsList.length > 0 ? personalFactsList.join("\n") : "לא סופקו פרטים אישיים ספציפיים";

  const nicheBlock = [
    profile.niche ? `נישה: ${profile.niche}` : null,
    `שימוש באימוג'ים: ${profile.usesEmojis ? "כן" : "לא"}`,
    profile.toneStyle ? `טון דיבור מועדף: ${profile.toneStyle}` : null,
    profile.platforms.length ? `פלטפורמות פעילות: ${profile.platforms.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const eventLines = dailyInfo.events.length
    ? dailyInfo.events
        .map((e) => `- ${e.title}${e.hebrew ? ` (${e.hebrew})` : ""}${e.memo ? `: ${e.memo}` : ""}`)
        .join("\n")
    : "אין אירוע מיוחד היום (חג/צום/ראש חודש)";

  // Only surface the weekly parasha as the week actually approaches Shabbat (Thu/Fri/Sat) -
  // mentioning "this week's Torah portion" on a random Sunday/Monday feels forced.
  const isNearShabbat = getWeekday(dailyInfo.gregorianDate) >= 4;

  const dateBlock = [
    `תאריך לועזי: ${dailyInfo.gregorianDate}`,
    `תאריך עברי: ${dailyInfo.hebrewDate.formatted}`,
    `אירועים מיוחדים היום:\n${eventLines}`,
    dailyInfo.shabbat.parasha && isNearShabbat
      ? `פרשת השבוע (הקשר שבועי, לא בהכרח היום עצמו): ${dailyInfo.shabbat.parasha}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const persistentContextBlock =
    profile.persistentContext && profile.persistentContext.trim()
      ? `--- פרטים קבועים שהיוצר/ת ביקש/ה לזכור תמיד (רקע קבוע, לא הוראה חד-פעמית) ---\n${profile.persistentContext.trim()}`
      : null;

  const hintBlock =
    hint && hint.trim()
      ? `--- כיוון מבוקש מהיוצר/ת להיום (רשות, השראה רכה בלבד) ---\n"${hint.trim()}"`
      : null;

  const currentEventBlock = currentEvent
    ? `--- אירוע תקופה אפשרי (רשות בלבד - לא חובה, לכל היותר רעיון אחד) ---\nכותרת: ${currentEvent.title}\nהקשר: ${currentEvent.description}`
    : null;

  return [
    `היום המדויק שעבורו יש ליצור את כל הרעיונות הוא ${dailyInfo.gregorianDate} (${dailyInfo.hebrewDate.formatted}). כל הרעיונות חייבים להיות רלוונטיים ליום הזה בדיוק - לא למחר ולא לתאריך אחר.`,
    "להלן הנתונים המאומתים היחידים שמותר להשתמש בהם - אסור להמציא נתונים שלא מופיעים כאן:",
    "--- פרטים אישיים על היוצר (רקע להכרות עם היוצר - לא תוכן שחייב להישתל ברעיונות) ---",
    personalBlock,
    "--- נישה ותחום עיסוק ---",
    nicheBlock || "לא סופקו פרטי נישה נוספים",
    profile.sector ? `--- מגזר (מסגרת תרבותית בלבד - לא מקור לתוכן) ---\nמגזר: ${profile.sector}` : null,
    "--- תאריך והקשר לוח שנה ---",
    dateBlock,
    "--- הקשר מהיסטוריית התוכן של היוצר (סיכום מ-14 הימים האחרונים, לא רשימה גולמית) ---",
    getRecentContext(profile.id),
    persistentContextBlock,
    hintBlock,
    currentEventBlock,
    "---",
    `צרו בדיוק ${count} רעיונות תוכן קונקרטיים. כל רעיון חייב להיות בעל נושא וזווית מרכזית שונים בבירור מהרעיונות האחרים - לא רק ניסוח שונה לאותו רעיון. רוב הרעיונות צריכים לנבוע מהנישה המקצועית של היוצר ומהקשר לוח השנה האמיתי. הפרטים האישיים הם רקע להיכרות עם היוצר בלבד - הם צריכים להשפיע על הטון ועל בחירת הזוויות, לא להופיע כתוכן מפורש, אלא אם זה נובע בטבעיות מוחלטת מרעיון ספציפי. הימנעו מברירת המחדל הסטריאוטיפית הראשונה שעולה לכם.`,
    "החזירו אך ורק אובייקט JSON במבנה הבא, ללא טקסט נוסף מחוץ ל-JSON:",
    `{"ideas": [{"title": "כותרת קצרה", "description": "תיאור קצר ופרקטי של הרעיון", "type": "הסוג המתאים"}]}`,
    `ודאו שמערך ה-ideas מכיל בדיוק ${count} פריטים.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

type OpenAiChatResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
};

export async function generateIdeas(
  profile: CreatorProfile,
  dailyInfo: DailyHebcalInfo,
  count: number = DEFAULT_IDEA_COUNT,
  hint: string | null = null,
): Promise<ContentIdea[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY לא מוגדר");
  }

  const activeEvents = getActiveEventsForSector(profile.sector, dailyInfo.gregorianDate);
  const includedEvent =
    activeEvents.length > 0 && Math.random() < CURRENT_EVENT_INCLUSION_PROBABILITY ? activeEvents[0] : null;

  const systemPrompt = buildSystemPrompt(profile.sector, profile.gender);
  const userPrompt = buildUserPrompt(profile, dailyInfo, count, hint, includedEvent);

  const estimatedCost = estimateCallCostUsd(systemPrompt.length + userPrompt.length, count, OPENAI_MODEL);

  if (wouldExceedDailyLimit(profile.id, estimatedCost)) {
    console.warn(
      `[api-usage] Blocked OpenAI call before it was sent - creator ${profile.id} would exceed the daily cost cap ` +
        `(estimated cost of this call: $${estimatedCost.toFixed(4)}).`,
    );
    throw new Error(DAILY_LIMIT_MESSAGE);
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.9,
      presence_penalty: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`בקשה ל-OpenAI נכשלה (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as OpenAiChatResponse;

  if (data.usage) {
    const actualCost = computeActualCostUsd(data.usage.prompt_tokens, data.usage.completion_tokens, OPENAI_MODEL);
    recordApiUsage(profile.id, actualCost);
  } else {
    recordApiUsage(profile.id, estimatedCost);
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("תשובת OpenAI לא הכילה תוכן");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("תשובת OpenAI לא הייתה JSON תקין");
  }

  const rawIdeas = (parsed as { ideas?: unknown }).ideas;
  if (!Array.isArray(rawIdeas)) {
    throw new Error("תשובת OpenAI לא הכילה מערך ideas");
  }

  const draftIdeas: Omit<ContentIdea, "id">[] = rawIdeas.map((idea) => {
    const record = idea as Partial<ContentIdea>;
    return {
      title: String(record.title ?? ""),
      description: String(record.description ?? ""),
      type: String(record.type ?? ""),
    };
  });

  const ids = recordIdeasShown(profile.id, dailyInfo.gregorianDate, draftIdeas);
  const ideas: ContentIdea[] = draftIdeas.map((idea, i) => ({ id: ids[i], ...idea }));

  return ideas;
}
