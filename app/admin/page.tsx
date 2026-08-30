import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { DAILY_COST_LIMIT_USD } from "@/lib/config";
import { constantTimeEqual } from "@/lib/secretCompare";
import adminStyles from "./admin.module.css";
import styles from "./admin-hub.module.css";

export const metadata: Metadata = {
  title: "ניהול | ניצוץ",
};

function todayIsrael(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function AdminHubPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || !secret || !constantTimeEqual(secret, adminSecret)) {
    return (
      <main className={adminStyles.unauthorized}>
        <h1>לא מורשה</h1>
        <p className={adminStyles.unauthorizedHint}>יש לגשת עם ?secret= נכון בכתובת.</p>
      </main>
    );
  }

  const activeEventsCount = (
    db.prepare("SELECT COUNT(*) as c FROM current_events WHERE active = 1").get() as { c: number }
  ).c;

  const todayCost = (
    db
      .prepare("SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM api_usage WHERE date = ?")
      .get(todayIsrael()) as { total: number }
  ).total;

  const whatsappCount = (db.prepare("SELECT COUNT(*) as c FROM whatsapp_log").get() as { c: number }).c;

  const feedbackCount = (db.prepare("SELECT COUNT(*) as c FROM feedback_notes").get() as { c: number }).c;

  const secretParam = `?secret=${encodeURIComponent(secret)}`;

  return (
    <main className={adminStyles.pageNarrow}>
      <h1 className={styles.title}>ניהול ניצוץ</h1>

      <div className={styles.cardsList}>
        <Link href={`/admin/events${secretParam}`} className={styles.hubCard}>
          <strong>אירועי תקופה</strong>
          <p className={styles.hubCardSub}>{activeEventsCount} אירועים פעילים כרגע</p>
        </Link>

        <Link href={`/admin/api-usage${secretParam}`} className={styles.hubCard}>
          <strong>מעקב עלויות API</strong>
          <p className={styles.hubCardSub}>
            עלות מצטברת היום (כל היוצרות): ${todayCost.toFixed(4)} · תקרה ליוצרת: ${DAILY_COST_LIMIT_USD.toFixed(2)}
          </p>
        </Link>

        <Link href={`/admin/whatsapp-log${secretParam}`} className={styles.hubCard}>
          <strong>לוג הודעות וואטסאפ (הדמיה)</strong>
          <p className={styles.hubCardSub}>{whatsappCount} הודעות נשלחו בהדמיה בסך הכול</p>
        </Link>

        <Link href={`/admin/feedback${secretParam}`} className={styles.hubCard}>
          <strong>הערות ממשתמשות</strong>
          <p className={styles.hubCardSub}>{feedbackCount} הערות התקבלו בסך הכול</p>
        </Link>
      </div>
    </main>
  );
}
