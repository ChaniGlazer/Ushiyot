import type { CreatorProfile } from "./creators";
import { OPENAI_MODEL, OPENAI_TIMEOUT_MS } from "./config";
import { computeActualCostUsd, estimateCallCostUsd } from "./costEstimate";
import {
  adjustApiUsage,
  DAILY_LIMIT_MESSAGE,
  GLOBAL_DAILY_LIMIT_MESSAGE,
  refundApiUsage,
  reserveApiUsage,
  wouldExceedGlobalDailyLimit,
} from "./apiUsage";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// A full draft runs longer than a short idea blurb - budget roughly 3x an idea's
// worth of output tokens for the pre-flight cost estimate (real cost is recorded after the call).
const DRAFT_OUTPUT_BUDGET_UNITS = 3;

// Common Hebrew "we will do X" future-plural phrasing that signals a meta-description
// of the content instead of the content itself (e.g. "ניצור סקר" instead of the actual questions).
const META_DESCRIPTION_MARKERS = [
  "ניצור",
  "נשאל",
  "נציג",
  "נשתף",
  "נכתוב",
  "נבקש",
  "נערוך",
  "נבצע",
  "נפרסם",
  "נעשה",
  "נדבר",
  "נספר",
];

function containsMetaDescriptionLanguage(text: string): boolean {
  return META_DESCRIPTION_MARKERS.some((marker) => text.includes(marker));
}

export type IdeaInput = {
  title: string;
  description: string;
  type: string;
};

const QUIZ_FEW_SHOT = [
  "דוגמה קונקרטית להבדל בין draft_text גרוע לטוב, עבור רעיון מסוג 'שאלון/סקר' (כותרת: 'איזו את/ה בזוגיות?', תיאור: 'שאלון קליל לסטורי שבודק את סגנון התקשורת הזוגי של העוקבים'):",
  "גרוע (אסור בהחלט - זה תיאור-מטא, לא תוכן): \"ניצור שאלון קצר שבו נשאל את העוקבים כמה שאלות על סגנון התקשורת שלהם בזוגיות ונציג להם תוצאה בסוף.\"",
  "טוב (התוכן עצמו, מוכן להעתקה): \"1. איך את/ה הכי אוהב/ת לפתור ויכוח?\\nא. לדבר על זה מיד\\nב. לקחת רגע לפני שמדברים\\n\\n2. מה הכי חשוב לך בתקשורת עם בן/בת הזוג?\\nא. כנות ישירה\\nב. רגישות ועדינות\\n\\n3. איך את/ה מעדיפ/ה לקבל מחמאה?\\nא. במילים\\nב. במעשים\\n\\n(וכן הלאה - כל 5-8 השאלות בפועל, מנוסחות במלואן, לא רק תיאור שיש שאלון)\"",
].join("\n");

function buildSystemPrompt(gender: string | null): string {
  const genderNote =
    gender === "בן" || gender === "בת"
      ? `מגדר היוצר/ת: ${gender}. אם draft_text מנוסח בגוף שפונה ליוצר/ת או מייצג אותו/ה (למשל טקסט שכתוב כאילו היוצר/ת עצמו/ה כותב/ת אותו), השתמשו בהטיות דקדוקיות בעברית שמתאימות למגדר הזה (${gender === "בן" ? "לשון זכר" : "לשון נקבה"}).`
      : null;

  return [
    "אתה כותב תוכן שמרחיב רעיון קצר לטקסט מלא ומוכן לפרסום ברשתות חברתיות.",
    genderNote,
    "אתה יודע רק את מה שסופק לך בהודעת המשתמש בקונטקסט - אסור לך להמציא עובדות, תאריכים, אירועים או פרטים שלא נמסרו במפורש.",
    "draft_text הוא התוכן הסופי בפועל שהיוצר/ת יעתיק/תעתיק וידביק/תדביק ישירות לפרסום - לא תיאור של מה התוכן יהיה, ולא הסבר על הפורמט או הכוונה שמאחוריו. אסור בהחלט שהטקסט יכיל ניסוחים כמו 'ניצור סקר', 'נשאל אתכם', 'נציג שאלות', 'נשתף טיפ', 'נבקש מהעוקבים' - אלה מתארים כוונה עתידית, לא מבצעים אותה. כתבו את השאלות/הטקסט/התוכן עצמו, מנוסח במלואו, בדיוק כמו שהוא אמור להופיע בפוסט/סטורי בפועל.",
    "התאימו את הפלט המדויק לסוג הרעיון: אם הסוג הוא שאלון/סקר/מבחן - draft_text חייב לכלול את השאלות עצמן, מנוסחות במלואן (בדרך כלל 5-8 שאלות ממוספרות, מוכנות להעתקה ישירה לפיצ'ר הסקר/שאלות של אינסטגרם, עם אפשרויות תשובה אם רלוונטי). אם הסוג הוא פוסט - זהו טקסט הפוסט המלא. אם הסוג הוא תזכורת - זהו נוסח ההודעה המלאה. בכל מקרה draft_text הוא התוצר הסופי המוכן לשימוש בפועל, לא תיאור כללי שלו.",
    QUIZ_FEW_SHOT,
    "אורך הטקסט: כ-3 עד 6 משפטים לפוסט/תזכורת רגילים; שאלון/סקר יכול להיות ארוך יותר כדי לכלול את כל השאלות בפועל.",
    "התאימו את הטון, השפה והשימוש באימוג'ים לפרופיל היוצר/ת שסופק - אל תוסיפו סגנון שלא מתאים לו.",
    "השיבו אך ורק בעברית תקנית, ואך ורק בפורמט JSON חוקי בהתאם למבנה שיתבקש במפורש.",
  ]
    .filter(Boolean)
    .join("\n");
}

const RETRY_REINFORCEMENT =
  "תיקון חשוב: הניסיון הקודם שלך היה תיאור-מטא של התוכן (למשל 'ניצור/נשאל/נציג...') במקום התוכן עצמו. הפעם כתוב אך ורק את התוכן הסופי בפועל - אם זה שאלון, כתוב את כל השאלות המנוסחות במלואן; אם זה פוסט, כתוב את טקסט הפוסט עצמו. בלי לתאר מה תעשה - פשוט תעשה את זה.";

function buildUserPrompt(profile: CreatorProfile, idea: IdeaInput): string {
  const profileLines = [
    profile.niche ? `נישה: ${profile.niche}` : null,
    profile.toneStyle ? `טון דיבור: ${profile.toneStyle}` : null,
    `שימוש באימוג'ים: ${profile.usesEmojis ? "כן" : "לא"}`,
    profile.vocabularyStyle ? `סגנון שפה ודימויים מועדף: ${profile.vocabularyStyle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "--- פרופיל היוצר/ת (לצורך התאמת טון וסגנון בלבד) ---",
    profileLines || "לא סופקו פרטי פרופיל נוספים",
    "--- הרעיון להרחבה לטקסט מלא ---",
    `סוג: ${idea.type}`,
    `כותרת: ${idea.title}`,
    `תיאור קצר: ${idea.description}`,
    "---",
    "כתבו את התוכן הסופי בפועל עבור הרעיון הזה - לא תיאור שלו. אם הסוג מרמז על שאלון/סקר, כתבו את כל השאלות עצמן.",
    `החזירו אך ורק אובייקט JSON במבנה הבא, ללא טקסט נוסף מחוץ ל-JSON: {"draft_text": "התוכן הסופי המלא כאן"}`,
  ].join("\n\n");
}

type OpenAiChatResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
};

async function performExpandCall(
  profile: CreatorProfile,
  idea: IdeaInput,
  reinforcement: string | null,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY לא מוגדר");
  }

  const systemPrompt = reinforcement
    ? `${buildSystemPrompt(profile.gender)}\n${reinforcement}`
    : buildSystemPrompt(profile.gender);
  const userPrompt = buildUserPrompt(profile, idea);

  const estimatedCost = estimateCallCostUsd(
    systemPrompt.length + userPrompt.length,
    DRAFT_OUTPUT_BUDGET_UNITS,
    OPENAI_MODEL,
  );

  // Global backstop (across all creators) checked before the per-creator reservation - see
  // wouldExceedGlobalDailyLimit's docstring.
  if (wouldExceedGlobalDailyLimit(estimatedCost)) {
    console.warn(
      `[api-usage] Blocked expand-idea call before it was sent - global daily cost cap reached ` +
        `(creator ${profile.id}, estimated cost of this call: $${estimatedCost.toFixed(4)}).`,
    );
    throw new Error(GLOBAL_DAILY_LIMIT_MESSAGE);
  }

  // Reserves the estimated cost atomically before the call is sent (not just a check) - see
  // reserveApiUsage's docstring for why this closes a race two concurrent calls could exploit.
  if (!reserveApiUsage(profile.id, estimatedCost)) {
    console.warn(
      `[api-usage] Blocked expand-idea call before it was sent - creator ${profile.id} would exceed the daily cost cap ` +
        `(estimated cost of this call: $${estimatedCost.toFixed(4)}).`,
    );
    throw new Error(DAILY_LIMIT_MESSAGE);
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`בקשה ל-OpenAI נכשלה (${response.status}): ${errorBody}`);
    }
  } catch (error) {
    // The call never completed - the reservation above shouldn't count against the cap.
    refundApiUsage(profile.id, estimatedCost);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("הרחבת הרעיון ארכה יותר מדי זמן - נסו שוב");
    }
    throw error;
  }

  const data = (await response.json()) as OpenAiChatResponse;

  if (data.usage) {
    const actualCost = computeActualCostUsd(data.usage.prompt_tokens, data.usage.completion_tokens, OPENAI_MODEL);
    adjustApiUsage(profile.id, actualCost - estimatedCost);
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

  const draftText = (parsed as { draft_text?: unknown }).draft_text;
  if (typeof draftText !== "string" || !draftText.trim()) {
    throw new Error("תשובת OpenAI לא הכילה draft_text תקין");
  }

  return draftText.trim();
}

export async function expandIdea(profile: CreatorProfile, idea: IdeaInput): Promise<string> {
  const firstDraft = await performExpandCall(profile, idea, null);

  if (!containsMetaDescriptionLanguage(firstDraft)) {
    return firstDraft;
  }

  console.warn(
    `[expand-idea] draft_text looked like a meta-description (not the actual content) for creator ${profile.id} ` +
      `(idea type: "${idea.type}") - retrying once with reinforced instructions.`,
  );

  try {
    const retryDraft = await performExpandCall(profile, idea, RETRY_REINFORCEMENT);

    if (containsMetaDescriptionLanguage(retryDraft)) {
      console.warn(
        `[expand-idea] draft_text still looked like a meta-description after retry for creator ${profile.id} - returning it anyway.`,
      );
    }

    return retryDraft;
  } catch (error) {
    if (error instanceof Error && error.message === DAILY_LIMIT_MESSAGE) {
      console.warn(
        `[expand-idea] Could not retry for quality (daily cost cap reached) - returning the first draft as-is for creator ${profile.id}.`,
      );
      return firstDraft;
    }
    throw error;
  }
}
