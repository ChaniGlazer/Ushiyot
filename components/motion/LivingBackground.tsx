"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./LivingBackground.module.css";

type Blob = {
  className: string;
  x: string[];
  y: string[];
  duration: number;
  delay?: number;
};

// Three soft, low-opacity blobs drifting on independent (non-synchronized) loops - organic
// rather than a single mesh oscillating in lockstep. Percent offsets stay within the 10-15%
// range from the design brief.
const BLOBS: Blob[] = [
  { className: "blobPrimary", x: ["0%", "10%", "-6%", "0%"], y: ["0%", "-12%", "8%", "0%"], duration: 22 },
  { className: "blobFlame", x: ["0%", "-9%", "7%", "0%"], y: ["0%", "10%", "-8%", "0%"], duration: 27, delay: 2 },
  { className: "blobPrimarySoft", x: ["0%", "8%", "-10%", "0%"], y: ["0%", "9%", "-6%", "0%"], duration: 19, delay: 4 },
];

/**
 * Fixed, page-behind-everything decorative layer - mounted once at the root layout so it's
 * shared (not remounted) across every route. Pure visual chrome: aria-hidden, pointer-events
 * none, never affects layout or a11y tree.
 */
export default function LivingBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={styles.container} aria-hidden="true">
      {BLOBS.map((blob) => (
        <motion.div
          key={blob.className}
          className={`${styles.blob} ${styles[blob.className]}`}
          animate={prefersReducedMotion ? undefined : { x: blob.x, y: blob.y }}
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: blob.duration, delay: blob.delay, repeat: Infinity, ease: "linear" }
          }
        />
      ))}
    </div>
  );
}
