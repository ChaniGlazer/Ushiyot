import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { getProfileCompleteness, isProfileIncomplete, toCreatorProfile } from "@/lib/creators";
import { getDailyInfo, getFallbackDailyInfo, type DailyHebcalInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT } from "@/lib/generateIdeas";
import { getRemainingIdeaBatchesEstimate } from "@/lib/apiUsage";
import { getTodaysIdeaBatch } from "@/lib/ideaHistory";
import { getAccuracyBreakdown, computeAccuracyScore, getAccuracyLabel } from "@/lib/accuracyScore";
import { getRecentContext } from "@/lib/getRecentContext";
import { touchStreak } from "@/lib/streak";
import SettingsLink from "./SettingsLink";
import LogoutButton from "./LogoutButton";
import IdeasBoard from "./IdeasBoard";
import AccuracyGauge from "./AccuracyGauge";
import ThemeProvider from "./ThemeProvider";
import ContextCard from "./ContextCard";
import ProfileCompletionBadge from "./ProfileCompletionBadge";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "דשבורד | ניצוץ",
};

export default async function DashboardPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  // If Hebcal is down/slow, still render the dashboard - just without today's Hebrew
  // date/events/Shabbat info - rather than crashing the app's main page.
  let dailyInfo: DailyHebcalInfo;
  try {
    dailyInfo = await getDailyInfo();
  } catch (error) {
    console.error("[dashboard] getDailyInfo() failed - falling back to minimal daily info", error);
    dailyInfo = getFallbackDailyInfo();
  }

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
    <ThemeProvider dailyInfo={dailyInfo}>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.brandName}>ניצוץ</h1>
            <div className={styles.greetingRow}>
              <p className={styles.subtitle} title={displayName}>
                שלום, {displayName}
              </p>
              {streak.count > 1 && (
                <span
                  className={styles.streakBadge}
                  title={
                    streak.justFroze
                      ? `רצף של ${streak.count} ימים - שמרת על יום המנוחה, הרצף שלך נשמר 🕯️`
                      : `רצף של ${streak.count} ימים`
                  }
                >
                  🔥 {streak.count}
                </span>
              )}
              {isProfileIncomplete(profile) && <ProfileCompletionBadge percent={getProfileCompleteness(profile)} />}
            </div>
          </div>
          <div className={styles.headerActions}>
            <SettingsLink />
            <LogoutButton />
          </div>
        </header>

        <div className={styles.topRow}>
          <ContextCard dailyInfo={dailyInfo} showParasha={profile.showParasha} />

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
          initialIdeas={initialIdeas}
          initialFeedback={initialFeedback}
          remainingBatches={remainingBatches}
        />
      </main>
    </ThemeProvider>
  );
}
