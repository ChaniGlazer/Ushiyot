import type { Metadata } from "next";
import { db } from "@/lib/db";
import EventForm from "../EventForm";
import { updateEvent } from "../actions";
import adminStyles from "../../admin.module.css";

export const metadata: Metadata = {
  title: "עריכת אירוע | ניצוץ",
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

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { id } = await params;
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

  const event = db.prepare("SELECT * FROM current_events WHERE id = ?").get(Number(id)) as EventRow | undefined;

  if (!event) {
    return (
      <main className={adminStyles.unauthorized}>
        <h1>אירוע לא נמצא</h1>
      </main>
    );
  }

  let sectors: string[] = [];
  try {
    sectors = JSON.parse(event.relevant_sectors);
  } catch {
    sectors = [];
  }

  return (
    <main className={adminStyles.pageNarrow}>
      <h1 className={adminStyles.title}>עריכת אירוע: {event.title}</h1>
      <EventForm
        action={updateEvent}
        secret={secret}
        submitLabel="שמירה"
        defaultValues={{
          id: event.id,
          title: event.title,
          description: event.description,
          sectors,
          startDate: event.start_date,
          endDate: event.end_date,
          active: event.active === 1,
        }}
      />
    </main>
  );
}
