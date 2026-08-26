"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_PREMIUM, SPRING_SOFT } from "@/lib/motion";
import { buildMessageSequence, INSPIRATION_WORDS, pickWithoutImmediateRepeat, type LoadingMessage } from "@/lib/sparkLoadingCopy";

// --- Why there's no real streaming here -------------------------------------------------
// /api/generate-ideas (see lib/generateIdeas.ts) asks OpenAI for one closed JSON array of N
// ideas (title/description/type/category/rationale each) in a single response - not a single
// free-text completion. OpenAI's streaming mode streams *tokens*, not "idea 1 of 4 is done" -
// with `response_format: json_object` the whole array is only valid JSON once the model has
// finished the entire object, so a partial stream would just be an unparseable half-built
// string, not a usable early idea. Turning this into something genuinely streamable would mean
// a real backend redesign (e.g. one SSE event per idea as it's individually generated), which
// is out of scope for a loading-screen component - effort here goes into sections 2 and 4
// instead, per the brief's own prioritization.
// -----------------------------------------------------------------------------------------

const MESSAGE_INTERVAL_MS = 1800;
const ENERGY_MIN_STEP = 8;
const ENERGY_MAX_STEP = 16;
const PARTICLE_LIFETIME_MS = 900;

export type SparkLoadingExperienceProps = {
  /** Whether a real generation call is in flight. Flipping this to false plays a graceful
   * fade-out instead of an abrupt unmount - see onComplete. */
  isLoading: boolean;
  /** Fires once the fade-out finishes (after isLoading -> false), not the instant isLoading
   * changes - use this if the parent wants to wait for the exit animation before swapping in
   * the real content, rather than racing it. */
  onComplete?: () => void;
};

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c1 1 2 3 2 5a6 6 0 1 1-12 0c0-4 3-6 3-9 1 1 2 2 3-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SkeletonCard({ tall }: { tall?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border border-card-border bg-surface-1 p-5 ${
        tall ? "sm:col-span-2 sm:row-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 w-20 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-full bg-[linear-gradient(110deg,transparent_35%,hsl(var(--primary)/0.35)_50%,transparent_65%)] bg-[length:250%_100%] motion-safe:animate-spark-shimmer" />
        </div>
        <div className="h-7 w-7 shrink-0 rounded-[var(--radius-control)] bg-surface-2" />
      </div>
      <div className="h-5 w-4/5 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2">
        <div className="h-full w-full bg-[linear-gradient(110deg,transparent_35%,hsl(var(--primary)/0.35)_50%,transparent_65%)] bg-[length:250%_100%] motion-safe:animate-spark-shimmer" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-full overflow-hidden rounded-[var(--radius-sm)] bg-surface-2">
          <div className="h-full w-full bg-[linear-gradient(110deg,transparent_35%,hsl(var(--primary)/0.25)_50%,transparent_65%)] bg-[length:250%_100%] motion-safe:animate-spark-shimmer" />
        </div>
        <div className="h-3.5 w-3/4 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2">
          <div className="h-full w-full bg-[linear-gradient(110deg,transparent_35%,hsl(var(--primary)/0.25)_50%,transparent_65%)] bg-[length:250%_100%] motion-safe:animate-spark-shimmer" />
        </div>
      </div>
      <div className="mt-auto flex gap-2 pt-2">
        <div className="h-11 flex-1 rounded-[var(--radius-control)] bg-surface-2" />
        <div className="h-11 flex-1 rounded-[var(--radius-control)] bg-surface-2" />
      </div>
    </div>
  );
}

export default function SparkLoadingExperience({ isLoading, onComplete }: SparkLoadingExperienceProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());

  const [sequence, setSequence] = useState<LoadingMessage[]>([]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [energyPercent, setEnergyPercent] = useState(0);
  const [particles, setParticles] = useState<number[]>([]);
  const particleId = useRef(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [inspirationWord, setInspirationWord] = useState<string | null>(null);
  const lastWord = useRef<string | null>(null);

  // Fresh, reshuffled message sequence and reset "theater" state every time a new loading
  // session starts - captures `freshSequence` in this closure (rather than reading the
  // `sequence` state var) so the interval always steps through the run it was built for, not a
  // stale one from before this effect re-ran.
  useEffect(() => {
    if (!isLoading) return;

    const freshSequence = buildMessageSequence();
    // Deferred to a microtask (rather than called synchronously in the effect body) to avoid
    // a same-tick cascading render, matching the pattern used elsewhere for effect-driven setState.
    queueMicrotask(() => {
      setSequence(freshSequence);
      setMessageIndex(0);
      setEnergyPercent(0);
      setParticles([]);
      setCardFlipped(false);
      setInspirationWord(null);
    });
    lastWord.current = null;

    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % freshSequence.length);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isLoading]);

  function handleEnergyClick() {
    setEnergyPercent((p) => {
      if (p >= 100) return p;
      const step = ENERGY_MIN_STEP + Math.random() * (ENERGY_MAX_STEP - ENERGY_MIN_STEP);
      return Math.min(100, Math.round(p + step));
    });

    if (!prefersReducedMotion) {
      const id = particleId.current++;
      setParticles((prev) => [...prev, id]);
      setTimeout(() => setParticles((prev) => prev.filter((p) => p !== id)), PARTICLE_LIFETIME_MS);
    }

    try {
      navigator.vibrate?.(15);
    } catch {
      // vibration unsupported - silent no-op, purely a nice-to-have
    }
  }

  function handleInspirationClick() {
    const next = pickWithoutImmediateRepeat(INSPIRATION_WORDS, lastWord.current);
    lastWord.current = next;
    setInspirationWord(next);
    setCardFlipped(true);

    try {
      navigator.vibrate?.(15);
    } catch {
      // vibration unsupported - silent no-op
    }
  }

  const message = sequence[messageIndex];
  const energyLabel =
    energyPercent >= 100 ? "טעון לגמרי — עוד רגע קטן..." : `הטענת ${energyPercent}% אנרגיה לניצוץ ✨`;

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
          className="flex flex-col gap-6"
        >
          {/* 1. Skeleton cards, shaped like the real thing - not a generic gray box. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonCard tall />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          {/* 2. Rotating micro-copy - identity first, then suspense, then the shuffled loop. */}
          <div className="flex min-h-[3.5rem] items-center justify-center px-4 text-center">
            <AnimatePresence mode="wait">
              {message && (
                <motion.p
                  key={`${messageIndex}-${message.text}`}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: EASE_PREMIUM }}
                  className={
                    message.type === "wisdom"
                      ? "font-heading text-base italic text-text-muted"
                      : "text-sm text-foreground/85"
                  }
                >
                  {message.text}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* 4. Inspiration card - 3D flip revealing a single word, re-rollable. Reduced
                motion gets its own single-layer render (a plain crossfade of text), not the
                same two-face structure with the rotation switched off - stacking both faces
                with no rotation to hide either one would show both texts overlapping at once. */}
            <button
              type="button"
              onClick={handleInspirationClick}
              aria-label={inspirationWord ? `מילת השראה: ${inspirationWord}. לחץ להגרלה נוספת` : "לחץ לקבלת מילת השראה"}
              className="focus-visible:outline-2 focus-visible:outline-primary"
            >
              {prefersReducedMotion ? (
                <div className="flex h-24 w-40 items-center justify-center rounded-[var(--radius-card)] border border-card-border bg-surface-1 px-3 text-center">
                  {cardFlipped && inspirationWord ? (
                    <span className="font-heading text-2xl font-bold text-primary">{inspirationWord}</span>
                  ) : (
                    <span className="text-xs text-text-muted">לחץ לקבלת מילת השראה</span>
                  )}
                </div>
              ) : (
                <div className="[perspective:800px]">
                  <motion.div
                    className="relative h-24 w-40 [transform-style:preserve-3d]"
                    animate={{ rotateY: cardFlipped ? 180 : 0 }}
                    transition={SPRING_SOFT}
                  >
                    <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] border border-card-border bg-surface-1 px-3 text-center text-xs text-text-muted [backface-visibility:hidden]">
                      לחץ לקבלת מילת השראה
                    </div>
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] border border-border-glow bg-surface-1 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    >
                      {cardFlipped && inspirationWord && (
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={inspirationWord}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: EASE_PREMIUM }}
                            className="font-heading text-2xl font-bold text-primary"
                          >
                            {inspirationWord}
                          </motion.span>
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </button>

            {/* 5. Energy icon - pure theater, not tied to real progress. */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                type="button"
                onClick={handleEnergyClick}
                aria-label="הטענת אנרגיה לניצוץ"
                className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border-glow bg-surface-1 text-primary"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                animate={prefersReducedMotion ? undefined : { scale: 1 + energyPercent / 400 }}
                transition={SPRING_SOFT}
              >
                <FlameIcon className="h-8 w-8" />
                {particles.map((id) => (
                  <span
                    key={id}
                    className="pointer-events-none absolute bottom-2 h-1.5 w-1.5 rounded-full bg-flame-accent motion-safe:animate-spark-particle-rise"
                    style={{ insetInlineStart: `${30 + ((id * 37) % 40)}%` }}
                  />
                ))}
              </motion.button>
              <span className="text-xs text-text-muted">{energyLabel}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
