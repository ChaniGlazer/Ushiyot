import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { constantTimeEqual } from "@/lib/secretCompare";
import CopyMessageButton from "./CopyMessageButton";
import adminStyles from "../admin.module.css";
import styles from "./whatsapp-log.module.css";

export const metadata: Metadata = {
  title: "לוג וואטסאפ | ניצוץ",
};

type LogRow = {
  id: number;
  phone: string;
  message_text: string;
  sent_at: string;
  status: string;
  name: string | null;
  email: string | null;
};

export default async function WhatsappLogPage({
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
      `SELECT whatsapp_log.id, whatsapp_log.phone, whatsapp_log.message_text, whatsapp_log.sent_at, whatsapp_log.status, creators.name, creators.email
       FROM whatsapp_log
       LEFT JOIN creators ON creators.id = whatsapp_log.creator_id
       ORDER BY whatsapp_log.sent_at DESC
       LIMIT 200`,
    )
    .all() as LogRow[];

  return (
    <main className={adminStyles.pageWide}>
      <Link href={`/admin?secret=${encodeURIComponent(secret)}`} className={adminStyles.backLink}>
        ← לעמוד הניהול המרכזי
      </Link>
      <h1 className={styles.title}>לוג הודעות וואטסאפ (הדמיה)</h1>
      <p className={styles.subtitle}>
        {rows.length} הודעות אחרונות שנשלחו בהדמיה - אף אחת מהן לא באמת יצאה החוצה.
      </p>

      {rows.length === 0 ? (
        <p className={styles.empty}>אין עדיין רשומות.</p>
      ) : (
        <div className={styles.logList}>
          {rows.map((row) => (
            <Card as="article" key={row.id}>
              <div className={styles.logHeader}>
                <span>{row.name ?? row.email ?? "יוצר לא ידוע"}</span>
                <span>{row.phone}</span>
                <span>{row.sent_at}</span>
                <span className={styles.statusBadge}>{row.status}</span>
              </div>
              <pre className={styles.messageText}>{row.message_text}</pre>
              <CopyMessageButton text={row.message_text} />
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
