"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_PREMIUM } from "@/lib/motion";
import { buildMessageSequence, type LoadingMessage } from "@/lib/sparkLoadingCopy";

// --- Why there's no real streaming here -------------------------------------------------
// /api/generate-ideas (see lib/generateIdeas.ts) asks OpenAI for one closed JSON array of N
// ideas (title/description/type/category/rationale each) in a single response - not a single
// free-text completion. OpenAI's streaming mode streams *tokens*, not "idea 1 of 4 is done" -
// with `response_format: json_object` the whole array is only valid JSON once the model has
// finished the entire object, so a partial stream would just be an unparseable half-built
// string, not a usable early idea. Turning this into something genuinely streamable would mean
// a real backend redesign (e.g. one SSE event per idea as it's individually generated), which
// is out of scope for a loading-screen component - effort here goes into the copy and the
// progress theater instead.
// -----------------------------------------------------------------------------------------

const MESSAGE_INTERVAL_MS = 3200;
const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export type SparkLoadingExperienceProps = {
  /** Whether a real generation call is in flight. Flipping this to false plays a graceful
   * fade-out instead of an abrupt unmount - see onComplete. */
  isLoading: boolean;
  /** Fires once the fade-out finishes (after isLoading -> false), not the instant isLoading
   * changes - use this if the parent wants to wait for the exit animation before swapping in
   * the real content, rather than racing it. */
  onComplete?: () => void;
};

type Glow = {
  key: string;
  positionClassName: string;
  colorClassName: string;
  x: string[];
  y: string[];
  duration: number;
  delay?: number;
};

// Two soft, low-opacity glows drifting on independent loops. Scoped to this overlay rather than
// reusing the site-wide LivingBackground: that one sits at z-index:-1 behind the *page*, which
// this overlay covers with its own backdrop, so it wouldn't show through - this is a
// self-contained version of the same drifting-blob technique, tuned to be the entire visual
// backdrop while the overlay is up.
const GLOWS: Glow[] = [
  {
    key: "primary",
    positionClassName: "-left-1/4 -top-1/4 h-[70vmax] w-[70vmax]",
    colorClassName: "bg-primary/20",
    x: ["-6%", "8%", "-4%", "-6%"],
    y: ["-4%", "6%", "8%", "-4%"],
    duration: 16,
  },
  {
    key: "flame",
    positionClassName: "-bottom-1/4 -right-1/4 h-[65vmax] w-[65vmax]",
    colorClassName: "bg-flame-accent/15",
    x: ["6%", "-8%", "4%", "6%"],
    y: ["6%", "-6%", "-8%", "6%"],
    duration: 20,
    delay: 1.5,
  },
];

function LoadingBackground({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {GLOWS.map((glow) => (
        <motion.div
          key={glow.key}
          className={`absolute rounded-full blur-[100px] ${glow.positionClassName} ${glow.colorClassName}`}
          animate={prefersReducedMotion ? undefined : { x: glow.x, y: glow.y }}
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: glow.duration, delay: glow.delay, repeat: Infinity, ease: "linear" }
          }
        />
      ))}
    </div>
  );
}

export default function SparkLoadingExperience({ isLoading, onComplete }: SparkLoadingExperienceProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());

  const [sequence, setSequence] = useState<LoadingMessage[]>([]);
  const [messageIndex, setMessageIndex] = useState(0);
  // Automatic, not tied to real progress - climbs fast at first, then decelerates and hovers
  // just short of done, so it never technically finishes on its own; only the real result
  // arriving snaps it to 100%. That near-the-end crawl is where the "suspense" comes from, not
  // a naive linear fill.
  const [autoProgress, setAutoProgress] = useState(0);

  // Fresh, reshuffled message sequence and reset progress every time a new loading session
  // starts - captures `freshSequence` in this closure (rather than reading the `sequence` state
  // var) so the interval always steps through the run it was built for, not a stale one from
  // before this effect re-ran.
  useEffect(() => {
    if (!isLoading) {
      // a satisfying snap to "done" right as the real result arrives
      queueMicrotask(() => setAutoProgress(100));
      return;
    }

    const freshSequence = buildMessageSequence();
    queueMicrotask(() => {
      setSequence(freshSequence);
      setMessageIndex(0);
      setAutoProgress(0);
    });

    const messageInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % freshSequence.length);
    }, MESSAGE_INTERVAL_MS);

    const progressInterval = setInterval(() => {
      setAutoProgress((p) => (p >= 92 ? Math.min(92, p + 0.2) : p + (92 - p) * 0.05 + 0.4));
    }, 150);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isLoading]);

  const message = sequence[messageIndex];
  const ringOffset = RING_CIRCUMFERENCE * (1 - autoProgress / 100);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isLoading && (
        <motion.div
          key="spark-loading-experience"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_PREMIUM }}
          // Full-screen overlay (not inline content) - a loading state buried in the middle of
          // a tall page, below the fold, is easy to miss entirely; this guarantees it's the
          // first thing on screen the moment generation starts, regardless of scroll position.
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden bg-background px-6 py-10"
        >
          <LoadingBackground prefersReducedMotion={prefersReducedMotion} />

          <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
            {/* Circular progress wheel - climbs fast, then hovers just short of "done" until
                the real result arrives and snaps it to 100%. */}
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--color-surface-2)" strokeWidth="6" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <span className="absolute font-label text-2xl font-bold tabular-nums text-foreground">
                {Math.round(autoProgress)}%
              </span>
            </div>

            {/* Rotating micro-copy - identity first, then suspense, then the shuffled loop. */}
            <div className="flex min-h-[4rem] items-center justify-center px-4 text-center">
              <AnimatePresence mode="wait">
                {message && (
                  <motion.p
                    key={`${messageIndex}-${message.text}`}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE_PREMIUM }}
                    className="text-base text-foreground/85"
                  >
                    {message.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
