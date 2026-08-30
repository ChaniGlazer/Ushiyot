import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { constantTimeEqual } from "@/lib/secretCompare";
import adminStyles from "../admin.module.css";
import styles from "./feedback.module.css";

export const metadata: Metadata = {
  title: "הערות ממשתמשות | ניצוץ",
};

type FeedbackRow = {
  id: number;
  message: string;
  created_at: string;
  name: string | null;
  email: string | null;
};

export default async function FeedbackPage({
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

  const rows = db
    .prepare(
      `SELECT feedback_notes.id, feedback_notes.message, feedback_notes.created_at, creators.name, creators.email
       FROM feedback_notes
       LEFT JOIN creators ON creators.id = feedback_notes.creator_id
       ORDER BY feedback_notes.created_at DESC
       LIMIT 200`,
    )
    .all() as FeedbackRow[];

  return (
    <main className={adminStyles.pageWide}>
      <Link href={`/admin?secret=${encodeURIComponent(secret)}`} className={adminStyles.backLink}>
        ← לעמוד הניהול המרכזי
      </Link>
      <h1 className={styles.title}>הערות ממשתמשות</h1>
      <p className={styles.subtitle}>{rows.length} הערות אחרונות שנשלחו מהדשבורד.</p>

      {rows.length === 0 ? (
        <p className={styles.empty}>אין עדיין הערות.</p>
      ) : (
        <div className={styles.list}>
          {rows.map((row) => (
            <Card as="article" key={row.id}>
              <div className={styles.rowHeader}>
                <span>{row.name ?? row.email ?? "יוצרת לא ידועה"}</span>
                <span>{row.created_at}</span>
              </div>
              <p className={styles.messageText}>{row.message}</p>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
