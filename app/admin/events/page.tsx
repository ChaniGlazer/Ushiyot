import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button, Card } from "@/components/ui";
import EventForm from "./EventForm";
import { createEvent, deleteEvent } from "./actions";
import adminStyles from "../admin.module.css";
import styles from "./events.module.css";

export const metadata: Metadata = {
  title: "ניהול אירועי תקופה | ניצוץ",
};

type EventRow = {
  id: number;
  title: string;
  description: string;
  relevant_sectors: string;
  start_date: string;
  end_date: string;
  active: number;
};

export default async function EventsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return (
      <main className={adminStyles.unauthorized}>
        <h1>לא מורשה</h1>
        <p className={adminStyles.unauthorizedHint}>יש לגשת עם ?secret= נכון בכתובת.</p>
      </main>
    );
  }

  const events = db.prepare("SELECT * FROM current_events ORDER BY start_date DESC").all() as EventRow[];
  const secretParam = `?secret=${encodeURIComponent(secret)}`;

  return (
    <main className={adminStyles.page}>
      <Link href={`/admin${secretParam}`} className={adminStyles.backLink}>
        ← לעמוד הניהול המרכזי
      </Link>
      <h1 className={adminStyles.title}>ניהול אירועי תקופה</h1>

      <Card className={styles.addSection}>
        <h2 className={styles.sectionTitle}>הוספת אירוע חדש</h2>
        <EventForm action={createEvent} secret={secret} submitLabel="הוספה" />
      </Card>

      <h2 className={styles.sectionTitle}>אירועים קיימים ({events.length})</h2>

      {events.length === 0 ? (
        <p className={styles.empty}>אין עדיין אירועים.</p>
      ) : (
        <div className={styles.eventsList}>
          {events.map((event) => {
            let sectors: string[] = [];
            try {
              sectors = JSON.parse(event.relevant_sectors);
            } catch {
              sectors = [];
            }

            return (
              <Card as="article" key={event.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <strong>{event.title}</strong>
                  <span className={`${styles.statusBadge} ${event.active ? styles.statusActive : ""}`}>
                    {event.active ? "פעיל" : "כבוי"}
                  </span>
                </div>
                <p className={styles.eventDescription}>{event.description}</p>
                <p className={styles.eventMeta}>
                  {event.start_date} – {event.end_date} · {sectors.join(", ")}
                </p>
                <div className={styles.eventActions}>
                  <Link href={`/admin/events/${event.id}${secretParam}`} className={adminStyles.backLink}>
                    עריכה
                  </Link>
                  <form action={deleteEvent}>
                    <input type="hidden" name="secret" value={secret} />
                    <input type="hidden" name="id" value={event.id} />
                    <Button type="submit" variant="danger" size="sm">
                      מחיקה
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
