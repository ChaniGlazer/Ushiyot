"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";
import { DURATION, EASE_PREMIUM, type MotionConflictingProps } from "@/lib/motion";
import styles from "./SparkButton.module.css";

export type SparkButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionConflictingProps> & {
  isLoading?: boolean;
};

const PARTICLE_OFFSETS = [-14, -4, 6, 16];

/**
 * The app's one central "make something happen" action (generate/regenerate today's ideas) -
 * gets its own dedicated treatment per the design brief: gradient glow, press feedback, and
 * while loading, a conic-gradient border spinning around the button itself (not a separate
 * spinner) plus a few rising spark particles - instead of living as another Button variant,
 * since none of that belongs on any other button in the app.
 */
export default function SparkButton({ isLoading = false, disabled, className, children, ...props }: SparkButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const showLoadingMotion = isLoading && !prefersReducedMotion;

  return (
    <div className={`${styles.borderWrap} ${showLoadingMotion ? styles.borderWrapSpinning : ""}`}>
      <motion.button
        type="button"
        className={[styles.button, isLoading ? styles.loading : "", className].filter(Boolean).join(" ")}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        whileHover={
          prefersReducedMotion || disabled || isLoading
            ? undefined
            : { y: -2, transition: { duration: DURATION.fast, ease: EASE_PREMIUM } }
        }
        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
        {...props}
      >
        <span className={styles.label}>{children}</span>

        {showLoadingMotion && (
          <span className={styles.particles} aria-hidden="true">
            <AnimatePresence>
              {PARTICLE_OFFSETS.map((x, i) => (
                <motion.span
                  key={i}
                  className={styles.particle}
                  style={{ insetInlineStart: `calc(50% + ${x}px)` }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -28, opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>
          </span>
        )}
      </motion.button>
    </div>
  );
}
