"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import styles from "./dashboard.module.css";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type TransparencyData = {
  niche: string | null;
  vocabularyStyle: string | null;
  toneStyle: string | null;
  platforms: string[];
  personalFacts: string[];
  persistentContext: string | null;
  usedCount: number;
  dismissedCount: number;
  expansionsCount: number;
  recentContextSummary: string;
};

type Props = {
  score: number;
  label: string;
  transparency: TransparencyData;
};

export default function AccuracyGauge({ score, label, transparency }: Props) {
  const [open, setOpen] = useState(false);
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className={styles.accuracyCard}>
      <svg viewBox="0 0 100 100" width="72" height="72" className={styles.accuracyRing} aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="57" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--foreground)">
          {score}%
        </text>
      </svg>
      <div className={styles.accuracyText}>
        <p className={styles.accuracyLabel}>{label}</p>
        <button type="button" className={styles.accuracyLink} onClick={() => setOpen(true)}>
          מה המערכת יודעת עליי?
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="מה המערכת יודעת עליי">
        <div className={styles.transparencyBody}>
          <section>
            <h3 className={styles.transparencySectionTitle}>מהפרופיל שמילאת</h3>
            <ul className={styles.transparencyList}>
              {transparency.niche && <li>נישה: {transparency.niche}</li>}
              {transparency.vocabularyStyle && <li>סגנון שפה: {transparency.vocabularyStyle}</li>}
              {transparency.toneStyle && <li>טון דיבור: {transparency.toneStyle}</li>}
              {transparency.platforms.length > 0 && <li>פלטפורמות: {transparency.platforms.join(", ")}</li>}
              {transparency.personalFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </section>

          {transparency.persistentContext && (
            <section>
              <h3 className={styles.transparencySectionTitle}>דברים שביקשת שנזכור</h3>
              <p>{transparency.persistentContext}</p>
            </section>
          )}

          <section>
            <h3 className={styles.transparencySectionTitle}>מה למדנו מהמשוב שלך</h3>
            <p>{transparency.recentContextSummary}</p>
            <ul className={styles.transparencyList}>
              <li>{transparency.usedCount} רעיונות סימנת כ&quot;השתמשתי בזה&quot;</li>
              <li>{transparency.dismissedCount} רעיונות סימנת כ&quot;לא בשבילי&quot;</li>
              <li>{transparency.expansionsCount} רעיונות הרחבת לפוסט מלא</li>
            </ul>
          </section>

          <p className={styles.transparencyFootnote}>
            האחוז במד הוא אינדיקציה לכמה משוב צברנו ממך - לא ציון מדעי - וכל המידע שמופיע כאן הוא בדיוק מה
            שבפועל שמור ומשפיע על הרעיונות שאת/ה מקבל/ת.
          </p>

          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
            סגירה
          </Button>
        </div>
      </Modal>
    </div>
  );
}
