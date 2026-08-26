// Text banks for SparkLoadingExperience (components/ui/SparkLoadingExperience.tsx) - kept as
// plain data, not inline in the component, so the copy can grow/be edited without touching
// component logic. Every bank is intentionally longer than what one loading session needs
// (3-15s at ~1.5-2s per message is ~2-9 messages) so a frequent user doesn't see the same
// handful of lines on repeat.

export type LoadingMessageType = "identity" | "suspense" | "process" | "wisdom" | "humor";

export type LoadingMessage = { text: string; type: LoadingMessageType };

// Always shown first - "this isn't a generic spinner, there's real thought happening".
const IDENTITY_LINES = [
  "אני לא עוד AI גנרי... בשבילך אני חושב קצת יותר ✨",
  "רעיונות טובים לא נולדים במהירות. כמעט שם...",
  "לא ממהר על הניצוץ שלך. עוד רגע קטן...",
  "יש כאן חשיבה, לא רק חישוב. שנייה...",
  "בונה לך משהו שבאמת ידבר. עוד רגע...",
  "אני לא הכי מהיר, אבל אני הכי שלי ✨",
  "כל ניצוץ נולד קצת אחרת. תן לי לדייק אותו בשבילך...",
  "לא מעתיק תבנית. בונה רעיון שמתאים רק לך...",
];

// Always shown second - builds curiosity about what's coming, reveals nothing.
const SUSPENSE_LINES = [
  "משהו טוב מתגבש כאן...",
  "זה מתחיל להיראות ממש טוב...",
  "רגע... יש כאן זווית מעניינת.",
  "אני חושב שזה יפתיע אותך.",
  "כמעט. וזה שווה את זה.",
  "רק עוד קצת ליטוש...",
  "משהו פה ממש עובד.",
  "זה הולך למקום טוב.",
  "עוד רגע תראה/י למה חיכית.",
];

// The "labor illusion" itself - concrete-sounding steps of what the AI is "doing" right now.
const PROCESS_LINES = [
  "סורק טרנדים חמים ברשת...",
  "מזקק זווית ייחודית עבורך...",
  "מנסח כותרת שתעצור גלילה...",
  "מוסיף את הניצוץ הסופי...",
  "בודק מה עובד היום בנישה שלך...",
  "מתאים את הטון בול לקהל שלך...",
  "מחפש את המילה המדויקת...",
  "מסנן רעיונות שכבר שחוקים...",
  "בונה מבנה שיזרום טבעי...",
  "מוודא שזה ידבר בעברית אמיתית...",
  "מצליב עם הלוח העברי של היום...",
  "מחפש את הזווית שמייחדת אותך...",
  "מכייל את רמת האנרגיה של הטקסט...",
  "בודק שהפתיח באמת תופס...",
  "מסדר את הרעיונות לפי עוצמה...",
  "מוסיף נגיעה אישית...",
  "עושה עוד סבב ליטוש...",
  "מוודא שזה קליל לקריאה...",
];

// Short, non-preachy - a different register from the operational lines, rendered in a
// slightly different style in the component to signal "a different kind of moment".
const WISDOM_QUOTES = [
  "איזהו עשיר? השמח בחלקו — פרקי אבות",
  "איזהו חכם? הלומד מכל אדם — פרקי אבות",
  "לא עליך המלאכה לגמור, ולא אתה בן חורין להיבטל ממנה — פרקי אבות",
  "אם אין אני לי מי לי, ואם לא עכשיו אימתי — הלל",
  "הוי דן את כל האדם לכף זכות — פרקי אבות",
  "מרבה עצה מרבה תבונה — פרקי אבות",
  "עשה לך רב, וקנה לך חבר — פרקי אבות",
  "במקום שאין אנשים השתדל להיות איש — פרקי אבות",
  "יפה שעה אחת בתשובה ומעשים טובים — פרקי אבות",
  "איזהו גיבור? הכובש את יצרו — פרקי אבות",
  "כל ישראל ערבים זה בזה — תלמוד בבלי",
  "טוב שם משמן טוב — קהלת",
  "עת לכל חפץ — קהלת",
  "יגעת ומצאת — תאמין",
  "אין דבר העומד בפני הרצון — פתגם עברי",
  "לאט לאט קונים חכמה — פתגם עברי",
];

// Light, in-on-the-joke humor aimed at content creators specifically.
const HUMOR_LINES = [
  "בודק שאין שגיאות עריכה... כי הפיד לא סולח 😉",
  "מכין לך ניצוץ של זהב ✨",
  "מוודא שאין וייב של '2 בבוקר וכתבתי שטויות'...",
  "בודק שזה לא נשמע כמו כל התוכן האחר בפיד...",
  "מסנן את כל האמוג'ים המיותרים... כמעט את כולם 😅",
  "מוודא שהקפה שלך לא יתקרר עד שזה מוכן...",
  "עושה בדיקת בדיחות גרועות לפני שממשיכים...",
  "בודק שזה לא נשמע כמו פרסומת...",
  "מנקה שאריות של 'טרנד מהעבר'...",
  "עוד רגע, כמעט יותר מהיר מהאלגוריתם...",
  "מוודא שאין קלישאות של 'תזכורת חשובה'...",
  "עושה בדיקת 'זה יעבוד בסטורי' לפני שממשיכים...",
  "מוחק גרסה ראשונה שהייתה קצת יותר מדי...",
  "רגע, רק מוודא שאין טעויות כתיב מביכות...",
  "מכוון את זה לפי הוייב של היום...",
  "בודק שזה שווה 'שמור לצפייה מאוחר יותר'...",
];

// For the "קלף השראה" flip card - single evocative words, revealed one at a time.
export const INSPIRATION_WORDS = [
  "אומץ",
  "אותנטיות",
  "עומק",
  "חן",
  "התמדה",
  "השראה",
  "יצירתיות",
  "בהירות",
  "חיבור",
  "סקרנות",
  "פשטות",
  "עוצמה",
  "אור",
  "ייחוד",
  "מסירות",
  "חמלה",
  "דיוק",
  "שמחה",
  "תשוקה",
  "נוכחות",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * One random line per pick, without repeating a word/line back-to-back - used both for the
 * process/wisdom/humor message loop and for the inspiration-word flip card.
 */
export function pickWithoutImmediateRepeat<T>(pool: T[], last: T | null): T {
  if (pool.length <= 1) return pool[0];
  let choice = pool[Math.floor(Math.random() * pool.length)];
  while (choice === last) {
    choice = pool[Math.floor(Math.random() * pool.length)];
  }
  return choice;
}

/**
 * identity (always first) -> suspense (always second) -> a shuffled, non-repeating run through
 * process/wisdom/humor for as long as the loading state lasts. Built once per loading session
 * (see the component's useMemo) so "no repeats in one loading run" holds even though each
 * individual bank only guarantees no *immediate* repeat on its own.
 */
export function buildMessageSequence(): LoadingMessage[] {
  const identity: LoadingMessage = { text: pickRandom(IDENTITY_LINES), type: "identity" };
  const suspense: LoadingMessage = { text: pickRandom(SUSPENSE_LINES), type: "suspense" };

  const rest: LoadingMessage[] = shuffle([
    ...PROCESS_LINES.map((text): LoadingMessage => ({ text, type: "process" })),
    ...WISDOM_QUOTES.map((text): LoadingMessage => ({ text, type: "wisdom" })),
    ...HUMOR_LINES.map((text): LoadingMessage => ({ text, type: "humor" })),
  ]);

  return [identity, suspense, ...rest];
}

function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}
