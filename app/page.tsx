"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import HomeTeaserWidget from "./HomeTeaserWidget";
import styles from "./home.module.css";

const PARALLAX_SCROLL_RANGE = [0, 300];

export default function Home() {
  const heroEntrance = useEntranceMotion(0);
  const teaserEntrance = useEntranceMotion(1);
  const prefersReducedMotion = useReducedMotion();
  // Scrolling the page past the hero drifts the logo up and fades it slightly - a subtle
  // parallax layer independent of heroGroup's own mount entrance (applied to the h1 alone so
  // the two animations don't both drive the same element's transform/opacity at once).
  const { scrollY } = useScroll();
  const logoY = useTransform(scrollY, PARALLAX_SCROLL_RANGE, [0, prefersReducedMotion ? 0 : -40]);
  const logoOpacity = useTransform(scrollY, PARALLAX_SCROLL_RANGE, [1, prefersReducedMotion ? 1 : 0.5]);

  return (
    <main className={styles.page}>
      {/* Quiet corner, not competing with the free example below - a returning/decided visitor
          can still get straight to login/signup, but a first-time visitor's eye isn't pulled
          away from the teaser by two big colored buttons before they've seen any value. */}
      <div className={styles.authLinks}>
        <Link href="/login" className={styles.authLink}>
          התחברות
        </Link>
        <span className={styles.authLinkDivider} aria-hidden="true">
          ·
        </span>
        <Link href="/onboarding" className={styles.authLink}>
          הרשמה
        </Link>
      </div>

      <motion.div className={styles.heroGroup} {...heroEntrance}>
        <motion.h1 className={styles.logo} style={{ y: logoY, opacity: logoOpacity }}>
          ניצוץ
        </motion.h1>
        <p className={styles.hook}>יוצר תוכן? הנה הרעיון הבא שלך</p>
        <p className={styles.tagline}>מתחדש כל יום, מותאם לנישה שלך — ראה דוגמה אמיתית למטה.</p>
      </motion.div>

      <motion.div {...teaserEntrance}>
        <HomeTeaserWidget />
      </motion.div>
    </main>
  );
}
