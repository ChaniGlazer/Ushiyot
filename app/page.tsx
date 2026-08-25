"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import HomeTeaserWidget from "./HomeTeaserWidget";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <h1 className={styles.logo}>ניצוץ</h1>
      <p className={styles.tagline}>
        רעיונות תוכן יומיים, מותאמים אישית ליוצרי תוכן ואושיות רשת —
        <br />
        מבוססים על הלוח העברי האמיתי.
      </p>
      <div className={styles.actions}>
        <Button as={Link} href="/onboarding" variant="primary" className={styles.ctaButton}>
          הרשמה
        </Button>
        <Button as={Link} href="/login" variant="secondary" className={styles.ctaButton}>
          התחברות
        </Button>
      </div>

      <HomeTeaserWidget />
    </main>
  );
}
