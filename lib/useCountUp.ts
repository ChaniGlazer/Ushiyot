"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { DURATION, EASE_PREMIUM } from "./motion";

/** Counts a number up from 0 to `target` once its attached ref scrolls into view - jumps
 * straight to the final value when the user prefers reduced motion. */
export function useCountUp<T extends Element>(target: number) {
  const ref = useRef<T>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      // Deferred to a microtask (rather than called synchronously in the effect body) to avoid
      // a same-tick cascading render, matching the pattern used elsewhere for effect-driven setState.
      queueMicrotask(() => setValue(target));
      return;
    }
    const controls = animate(0, target, {
      duration: DURATION.slow,
      ease: EASE_PREMIUM,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, target, prefersReducedMotion]);

  return { ref, value } as const;
}
