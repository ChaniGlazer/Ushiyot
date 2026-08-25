// Static, hand-written examples for the anonymous home-page teaser widget (see app/page.tsx).
// Deliberately NOT AI-generated at request time - an anonymous visitor must never trigger a
// real OpenAI call, or every home-page visit would cost money regardless of signup.
import type { ToneStyle } from "./creators";

export const TEASER_NICHES = [
  "כושר ותזונה",
  "הורות ומשפחה",
  "עסקים ויזמות",
  "אוכל ובישול",
  "לייף-סטייל ואופנה",
  "פיתוח אישי והשראה",
] as const;

export type TeaserNiche = (typeof TEASER_NICHES)[number];

export type TeaserIdea = {
  title: string;
  description: string;
  type: string;
};

const EXAMPLES: Record<TeaserNiche, Record<ToneStyle, TeaserIdea>> = {
  "כושר ותזונה": {
    רשמי: {
      title: "3 עקרונות תזונה שרוב האנשים מיישמים הפוך",
      description: "פירוק של שלוש טעויות תזונה נפוצות, עם ההסבר המקצועי לכל אחת ולמה הגישה הרווחת מטעה.",
      type: "פוסט מקצועי",
    },
    קליל: {
      title: "מה שאף אחד לא מספר לך על ימי צ'יט",
      description: "סטורי קליל עם 3 טעויות שאנשים עושים ביום צ'יט, ואיך להפוך אותו לכלי ולא לאויב.",
      type: "סטורי אינטראקטיבי",
    },
  },
  "הורות ומשפחה": {
    רשמי: {
      title: "הגבול הדק בין עצמאות לבדידות אצל ילדים",
      description: "ניתוח קצר של מתי לעודד עצמאות ומתי היא הופכת לתחושת נטישה - עם דוגמה מהשטח.",
      type: "פוסט מעורר מחשבה",
    },
    קליל: {
      title: "המשפט שכל הורה אומר ומתחרט עליו",
      description: "רשימת 5 משפטים שקופצים לנו ברגע כעס, וחלופה קלילה וממשית לכל אחד.",
      type: "רשימה שיתופית",
    },
  },
  "עסקים ויזמות": {
    רשמי: {
      title: "המספר האחד שכל עצמאי חייב לבדוק השבוע",
      description: "הסבר תמציתי על מדד תזרים שרוב העצמאים מתעלמים ממנו, ולמה הוא חשוב יותר מהרווח החודשי.",
      type: "פוסט מוביל סמכות",
    },
    קליל: {
      title: "הלקוח שכמעט ברח - ומה זה לימד אותי",
      description: "סיפור אישי קצר על טעות מול לקוח, בלי להאשים אף אחד, עם לקח אחד פרקטי בסוף.",
      type: "סיפור אישי",
    },
  },
  "אוכל ובישול": {
    רשמי: {
      title: "הטעות בטמפרטורת התנור שהורסת מרקמים",
      description: "הסבר קצר ומדויק על טעות אפייה נפוצה, עם התיקון הפרקטי הפשוט.",
      type: "טיפ מקצועי",
    },
    קליל: {
      title: "מתכון ל-10 דקות שנראה כאילו התאמצת שעה",
      description: "מתכון קליל ומהיר, עם הדגשה על 'הטריק' שגורם לו להיראות מרשים בלי מאמץ אמיתי.",
      type: "מתכון מהיר",
    },
  },
  "לייף-סטייל ואופנה": {
    רשמי: {
      title: "3 פריטים שכדאי להשקיע בהם ולמה",
      description: "ניתוח קצר של ערך-לכסף לאורך זמן בבחירת בגדי בסיס, עם קריטריון ברור לבחירה.",
      type: "פוסט מקצועי",
    },
    קליל: {
      title: "הלוק שחשבתי שלא ילך לי - והלך",
      description: "סטורי אישי וקליל עם 'לפני ואחרי' מחשבתי על שילוב שהפתיע אפילו אותך.",
      type: "סטורי אישי",
    },
  },
  "פיתוח אישי והשראה": {
    רשמי: {
      title: "ההרגל היומי בן 5 הדקות שמשנה נקודת מבט",
      description: "הסבר קצר ומבוסס על תרגול יומי מינימלי, עם הסיבה שהוא עובד גם כשקשה להתמיד.",
      type: "תובנה שבועית",
    },
    קליל: {
      title: "היום שבו הפסקתי להתנצל על הזמן שלי",
      description: "רגע אישי קצר וקליל על גבול שקבעת, עם משפט אחד שאפשר לאמץ מהיום.",
      type: "רגע השראה",
    },
  },
};

export function getTeaserIdea(niche: TeaserNiche, tone: ToneStyle): TeaserIdea {
  return EXAMPLES[niche][tone];
}
