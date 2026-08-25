"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui";
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
      <motion.div className={styles.heroGroup} {...heroEntrance}>
        <motion.h1 className={styles.logo} style={{ y: logoY, opacity: logoOpacity }}>
          ניצוץ
        </motion.h1>
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
      </motion.div>

      <motion.div {...teaserEntrance}>
        <HomeTeaserWidget />
      </motion.div>
    </main>
  );
}
