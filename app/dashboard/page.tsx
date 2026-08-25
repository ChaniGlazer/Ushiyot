import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { toCreatorProfile } from "@/lib/creators";
import { getDailyInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT } from "@/lib/generateIdeas";
import { getRemainingIdeaBatchesEstimate } from "@/lib/apiUsage";
import { getTodaysIdeaBatch } from "@/lib/ideaHistory";
import { getAccuracyBreakdown, computeAccuracyScore, getAccuracyLabel } from "@/lib/accuracyScore";
import { getRecentContext } from "@/lib/getRecentContext";
import { touchStreak } from "@/lib/streak";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import IdeasBoard from "./IdeasBoard";
import AccuracyGauge from "./AccuracyGauge";
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
  const initialIdeas = todaysIdeas.map(({ id, title, description, type, category, rationale }) => ({
    id,
    title,
    description,
    type,
    category,
    rationale,
  }));
  const initialFeedback = Object.fromEntries(
    todaysIdeas
      .filter((idea) => idea.status === "used" || idea.status === "dismissed")
      .map((idea) => [idea.id, idea.status as "used" | "dismissed"]),
  );

  const remainingBatches = getRemainingIdeaBatchesEstimate(creator.id);
  const displayName = creator.name ?? creator.email;
  const streak = await touchStreak(creator.id, dailyInfo.gregorianDate);

  const profile = toCreatorProfile(creator);
  const accuracyBreakdown = getAccuracyBreakdown(creator.id);
  const accuracyScore = computeAccuracyScore(
    accuracyBreakdown.usedCount + accuracyBreakdown.dismissedCount + accuracyBreakdown.expansionsCount,
  );
  const personalFacts = [
    profile.childrenCount !== null ? `מספר ילדים: ${profile.childrenCount}` : null,
    profile.city ? `עיר מגורים: ${profile.city}` : null,
    profile.familyStatus ? `מצב משפחתי: ${profile.familyStatus}` : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>ניצוץ</h1>
          <p className={styles.subtitle} title={displayName}>
            שלום, {displayName}
          </p>
          {streak.count > 1 && (
            <p className={styles.streakLine}>
              🔥 רצף של {streak.count} ימים
              {streak.justFroze && <span className={styles.streakFrozenNote}> · שמרת על יום המנוחה - הרצף שלך נשמר 🕯️</span>}
            </p>
          )}
        </div>
        <div className={styles.headerActions}>
          <LogoutButton />
          <DeleteAccountButton />
        </div>
      </header>

      <div className={styles.topRow}>
        <section className={styles.dateCard}>
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
        </section>

        <AccuracyGauge
          score={accuracyScore}
          label={getAccuracyLabel(accuracyScore)}
          transparency={{
            niche: profile.niche,
            vocabularyStyle: profile.vocabularyStyle,
            toneStyle: profile.toneStyle,
            platforms: profile.platforms,
            personalFacts,
            persistentContext: profile.persistentContext,
            usedCount: accuracyBreakdown.usedCount,
            dismissedCount: accuracyBreakdown.dismissedCount,
            expansionsCount: accuracyBreakdown.expansionsCount,
            recentContextSummary: getRecentContext(creator.id),
          }}
        />
      </div>

      <IdeasBoard
        creatorId={creator.id}
        initialIdeas={initialIdeas}
        initialFeedback={initialFeedback}
        remainingBatches={remainingBatches}
      />
    </main>
  );
}
