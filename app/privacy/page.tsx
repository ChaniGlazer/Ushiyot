import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "פרטיות | ניצוץ",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>פרטיות ונתונים</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>אילו נתונים אנחנו אוספים</h2>
        <ul className={styles.list}>
          <li>פרטי התחברות: שם, מגדר, מספר וואטסאפ וסיסמה (הסיסמה נשמרת מוצפנת, לא כטקסט גלוי)</li>
          <li>פרופיל היוצר: מגזר, נישה, טון דיבור, פלטפורמות פעילות</li>
          <li>פרטים אישיים אופציונליים: מספר ילדים, עיר מגורים, מצב משפחתי</li>
          <li>היסטוריית הרעיונות שנוצרו עבורך, כולל אילו סימנת כ&quot;השתמשתי בזה&quot; או &quot;לא בשבילי&quot;</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>איך המידע משמש</h2>
        <p>
          כדי לייצר עבורך רעיונות תוכן יומיים, פרטי הפרופיל שלך והתאריך העברי של היום נשלחים ל-OpenAI (ספק בינה
          מלאכותית חיצוני) לצורך יצירת הרעיונות. היסטוריית הרעיונות משמשת כדי לא לחזור על עצמנו ולהתאים את ההצעות
          לאורך זמן. אנחנו לא מוכרים ולא משתפים את המידע שלך למטרות אחרות.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מחיקת חשבון</h2>
        <p>
          ניתן למחוק את החשבון בכל עת ישירות מהדשבורד — הפעולה מוחקת לצמיתות את הפרופיל שלך ואת כל היסטוריית
          הרעיונות מהמסד נתונים. אפשר גם לפנות אלינו במייל{" "}
          <a href="mailto:support@nitzotz.example">support@nitzotz.example</a> ונטפל בבקשה.
        </p>
      </section>

      <Link href="/" className={styles.link}>
        ← חזרה לעמוד הבית
      </Link>
    </main>
  );
}
