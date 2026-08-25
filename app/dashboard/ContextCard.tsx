"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import type { DailyHebcalInfo } from "@/lib/hebcal";
import ThemeSparkIcon from "./ThemeSparkIcon";
import styles from "./dashboard.module.css";

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

export default function ContextCard({ dailyInfo }: { dailyInfo: DailyHebcalInfo }) {
  const entranceProps = useEntranceMotion(0);

  return (
    <Card as={motion.section} className={styles.dateCard} {...entranceProps}>
      <div className={styles.contextLabelRow}>
        <span className={styles.contextLabel}>היום</span>
        <ThemeSparkIcon />
      </div>
      <h2 className={styles.dateHebrew}>{dailyInfo.hebrewDate.formatted}</h2>
      <p className={styles.dateGregorian}>
        <span className={styles.mono}>{formatGregorianWithWeekday(dailyInfo.gregorianDate)}</span>
      </p>

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
          {dailyInfo.shabbat.candleLighting && (
            <>
              {" · כניסת שבת "}
              <span className={styles.mono}>{formatTime(dailyInfo.shabbat.candleLighting)}</span>
            </>
          )}
          {dailyInfo.shabbat.havdalah && (
            <>
              {" · יציאת שבת "}
              <span className={styles.mono}>{formatTime(dailyInfo.shabbat.havdalah)}</span>
            </>
          )}
        </p>
      )}
    </Card>
  );
}
