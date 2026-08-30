"use client";

import Link from "next/link";
import Button from "./Button";
import styles from "./ErrorState.module.css";

export type ErrorStateProps = {
  title?: string;
  message?: string;
  /** Shown as a "try again" button when provided - Next's error.tsx boundaries pass their own
   * reset() here to re-render the failed segment without a full page reload. */
  onRetry?: () => void;
};

// Shared fallback UI for every error.tsx boundary in the app (see app/error.tsx and
// app/dashboard/error.tsx) - a real Hebrew message and a way out, instead of Next's default
// unstyled error page.
export default function ErrorState({
  title = "משהו השתבש",
  message = "קרתה שגיאה בלתי צפויה. אפשר לנסות שוב, ואם זה חוזר על עצמו - לחזור לדף הבית.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {onRetry && (
          <Button type="button" variant="primary" onClick={onRetry}>
            נסו שוב
          </Button>
        )}
        <Button as={Link} href="/" variant="secondary">
          חזרה לדף הבית
        </Button>
      </div>
    </div>
  );
}
