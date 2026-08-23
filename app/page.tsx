import Link from "next/link";
import { db } from "@/lib/db";
import styles from "./home.module.css";

function checkDatabase(): boolean {
  try {
    db.exec("CREATE TABLE IF NOT EXISTS _healthcheck (id INTEGER PRIMARY KEY)");
    return true;
  } catch {
    return false;
  }
}

export default function Home() {
  const dbOk = checkDatabase();

  return (
    <main className={styles.page}>
      <h1>ניצוץ</h1>
      <p>מחולל רעיונות פועל</p>
      <p className={dbOk ? styles.statusOk : styles.statusError}>
        {dbOk ? "חיבור למסד הנתונים תקין" : "שגיאה בחיבור למסד הנתונים"}
      </p>
      <Link href="/onboarding" className={styles.link}>
        הרשמה כיוצר תוכן ←
      </Link>
      <Link href="/login" className={styles.link}>
        כבר רשומה? התחברות ←
      </Link>
    </main>
  );
}
