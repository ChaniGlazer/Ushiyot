"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import styles from "./dashboard.module.css";

const DISMISS_KEY = "nitzotz-profile-reminder-dismissed";

/**
 * Shown when the profile questionnaire (app/onboarding/OnboardingForm.tsx, steps 1-3) was
 * skipped - a gentle nudge back to it, not a blocker. Dismissing hides it for this session only
 * (sessionStorage, not localStorage) - the point is a recurring gentle reminder, not a
 * permanently silence-able one, but also not nagging on every single page render right after
 * someone already closed it.
 */
export default function ProfileReminderBanner() {
  // Starts hidden so the server-rendered HTML and the client's first paint match (no
  // sessionStorage access during render) - flips visible after a mount-only check confirms it
  // wasn't already dismissed this session.
  const [dismissed, setDismissed] = useState(true);
  const entranceProps = useEntranceMotion(0);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        setDismissed(false);
      }
    });
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignored - worst case the banner reappears on the next render this session
    }
  }

  if (dismissed) return null;

  return (
    <motion.div className={styles.profileReminder} {...entranceProps}>
      <p>עדיין לא השלמת את כל פרטי הפרופיל שלך - זה עוזר לנו להתאים לך רעיונות מדויקים יותר.</p>
      <div className={styles.profileReminderActions}>
        <Link href="/onboarding" className={styles.profileReminderLink}>
          להשלמת הפרופיל
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.profileReminderDismiss}
          aria-label="סגור תזכורת"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
