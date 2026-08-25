"use client";

import { useReducedMotion } from "framer-motion";
import { FADE_UP, FADE_UP_TRANSITION, STAGGER_STEP } from "./motion";

/**
 * Fade-up-on-scroll-into-view props, spreadable onto any `motion.*` element (including a
 * polymorphic component rendered `as={motion.article}` etc.) - `index` staggers siblings in
 * the same group (e.g. the 4 daily idea cards) by STAGGER_STEP each.
 *
 * Empty under prefers-reduced-motion, so the element renders in its natural DOM state with no
 * animation props at all - not a disabled/no-op animation, none.
 */
export function getEntranceMotionProps(prefersReducedMotion: boolean, index = 0) {
  if (prefersReducedMotion) return {};

  return {
    variants: FADE_UP,
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-40px" },
    transition: { ...FADE_UP_TRANSITION, delay: index * STAGGER_STEP },
  } as const;
}

/** Convenience hook for a single element (not inside a list/.map - see Rules of Hooks). */
export function useEntranceMotion(index = 0) {
  const prefersReducedMotion = useReducedMotion();
  return getEntranceMotionProps(Boolean(prefersReducedMotion), index);
}
