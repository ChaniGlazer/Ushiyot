"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import styles from "./dashboard.module.css";

const DISMISS_KEY = "nitzotz-profile-reminder-dismissed";

type Props = { percent: number };

/**
 * A small clickable tag next to the user's name (not a full-width banner) - only opens the
 * full explanation on click, matching how little space the dashboard header should cost
 * before the day's actual content. Dismissing inside the popover ("לא עכשיו") hides the badge
 * itself for the rest of the session (sessionStorage, not localStorage) - the point is a
 * recurring gentle reminder across visits, not a permanently silence-able one, but also not
 * re-appearing the moment someone closes it.
 */
export default function ProfileCompletionBadge({ percent }: Props) {
  // Starts hidden so the server-rendered HTML and the client's first paint match (no
  // sessionStorage access during render) - flips visible after a mount-only check confirms it
  // wasn't already dismissed this session.
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        setDismissed(false);
      }
    });
  }, []);

  // Close on outside click or Escape - same pattern as the idea card's own "⋮" menu.
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleDismiss() {
    setDismissed(true);
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignored - worst case the badge reappears on the next render this session
    }
  }

  if (dismissed) return null;

  return (
    <div className={styles.profileBadgeWrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.profileBadge}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {percent}% פרופיל ▾
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.profileBadgePopover}
            role="dialog"
            aria-label="השלמת פרופיל"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
          >
            <p>עדיין לא השלמת את כל פרטי הפרופיל שלך - זה עוזר לנו להתאים לך רעיונות מדויקים יותר.</p>
            <div className={styles.profileBadgePopoverActions}>
              <Link href="/onboarding" className={styles.profileReminderLink}>
                להשלמת הפרופיל
              </Link>
              <button type="button" onClick={handleDismiss} className={styles.profileReminderDismiss}>
                לא עכשיו
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
