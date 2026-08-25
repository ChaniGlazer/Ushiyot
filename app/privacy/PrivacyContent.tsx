"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import styles from "./privacy.module.css";

export default function PrivacyContent() {
  const titleEntrance = useEntranceMotion(0);
  const dataEntrance = useEntranceMotion(1);
  const usageEntrance = useEntranceMotion(2);
  const deletionEntrance = useEntranceMotion(3);
  const linkEntrance = useEntranceMotion(4);

  return (
    <>
      <motion.h1 className={styles.title} {...titleEntrance}>
        פרטיות ונתונים
      </motion.h1>

      <motion.section className={styles.section} {...dataEntrance}>
        <h2 className={styles.sectionTitle}>אילו נתונים אנחנו אוספים</h2>
        <ul className={styles.list}>
          <li>פרטי התחברות: שם, מגדר, מספר וואטסאפ וסיסמה (הסיסמה נשמרת מוצפנת, לא כטקסט גלוי)</li>
          <li>פרופיל היוצר: מגזר, נישה, טון דיבור, פלטפורמות פעילות</li>
          <li>פרטים אישיים אופציונליים: מספר ילדים, עיר מגורים, מצב משפחתי</li>
          <li>היסטוריית הרעיונות שנוצרו עבורך, כולל אילו סימנת כ&quot;השתמשתי בזה&quot; או &quot;לא בשבילי&quot;</li>
        </ul>
      </motion.section>

      <motion.section className={styles.section} {...usageEntrance}>
        <h2 className={styles.sectionTitle}>איך המידע משמש</h2>
        <p>
          כדי לייצר עבורך רעיונות תוכן יומיים, פרטי הפרופיל שלך והתאריך העברי של היום נשלחים ל-OpenAI (ספק בינה
          מלאכותית חיצוני) לצורך יצירת הרעיונות. היסטוריית הרעיונות משמשת כדי לא לחזור על עצמנו ולהתאים את ההצעות
          לאורך זמן. אנחנו לא מוכרים ולא משתפים את המידע שלך למטרות אחרות.
        </p>
      </motion.section>

      <motion.section className={styles.section} {...deletionEntrance}>
        <h2 className={styles.sectionTitle}>מחיקת חשבון</h2>
        <p>
          ניתן למחוק את החשבון בכל עת ישירות מהדשבורד — הפעולה מוחקת לצמיתות את הפרופיל שלך ואת כל היסטוריית
          הרעיונות מהמסד נתונים. אפשר גם לפנות אלינו במייל{" "}
          <a href="mailto:support@nitzotz.example">support@nitzotz.example</a> ונטפל בבקשה.
        </p>
      </motion.section>

      <motion.div {...linkEntrance}>
        <Link href="/" className={styles.link}>
          ← חזרה לעמוד הבית
        </Link>
      </motion.div>
    </>
  );
}
