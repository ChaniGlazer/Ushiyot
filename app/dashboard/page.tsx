import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { getDailyInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT } from "@/lib/generateIdeas";
import { getRemainingIdeaBatchesEstimate } from "@/lib/apiUsage";
import { getTodaysIdeaBatch } from "@/lib/ideaHistory";
import { Card } from "@/components/ui";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import IdeasBoard from "./IdeasBoard";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "דשבורד | ניצוץ",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
}

function formatGregorianWithWeekday(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  const weekday = date.toLocaleDateString("he-IL", { weekday: "long", timeZone: "Asia/Jerusalem" });
  const dayMonthYear = date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  });
  return `${weekday}, ${dayMonthYear}`;
}

export default async function DashboardPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const dailyInfo = await getDailyInfo();

  const todaysIdeas = getTodaysIdeaBatch(creator.id, dailyInfo.gregorianDate, DEFAULT_IDEA_COUNT);
  const initialIdeas = todaysIdeas.map(({ id, title, description, type }) => ({ id, title, description, type }));
  const initialFeedback = Object.fromEntries(
    todaysIdeas
      .filter((idea) => idea.status === "used" || idea.status === "dismissed")
      .map((idea) => [idea.id, idea.status as "used" | "dismissed"]),
  );

  const remainingBatches = getRemainingIdeaBatchesEstimate(creator.id);
  const displayName = creator.name ?? creator.email;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>ניצוץ</h1>
          <p className={styles.subtitle} title={displayName}>
            שלום, {displayName}
          </p>
        </div>
        <div className={styles.headerActions}>
          <LogoutButton />
          <DeleteAccountButton />
        </div>
      </header>

      <Card>
        <h2 className={styles.dateHebrew}>{dailyInfo.hebrewDate.formatted}</h2>
        <p className={styles.dateGregorian}>{formatGregorianWithWeekday(dailyInfo.gregorianDate)}</p>

        {dailyInfo.events.length > 0 ? (
          <ul className={styles.eventsList}>
            {dailyInfo.events.map((event) => (
              <li key={event.title}>{event.hebrew ?? event.title}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.noEvents}>אין אירוע מיוחד היום</p>
        )}

        {dailyInfo.shabbat.parasha && (
          <p className={styles.shabbatLine}>
            פרשת השבוע: {dailyInfo.shabbat.parasha}
            {dailyInfo.shabbat.candleLighting && ` · כניסת שבת ${formatTime(dailyInfo.shabbat.candleLighting)}`}
            {dailyInfo.shabbat.havdalah && ` · יציאת שבת ${formatTime(dailyInfo.shabbat.havdalah)}`}
          </p>
        )}
      </Card>

      <IdeasBoard
        creatorId={creator.id}
        initialIdeas={initialIdeas}
        initialFeedback={initialFeedback}
        remainingBatches={remainingBatches}
      />
    </main>
  );
}
