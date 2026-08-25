"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import HomeTeaserWidget from "./HomeTeaserWidget";
import styles from "./home.module.css";

export default function Home() {
  const heroEntrance = useEntranceMotion(0);
  const teaserEntrance = useEntranceMotion(1);

  return (
    <main className={styles.page}>
      <motion.div className={styles.heroGroup} {...heroEntrance}>
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
      </motion.div>

      <motion.div {...teaserEntrance}>
        <HomeTeaserWidget />
      </motion.div>
    </main>
  );
}
