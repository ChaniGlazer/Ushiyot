// Shared Framer Motion timing/easing so every component tunes speed in one place instead of
// scattering magic numbers - see the design brief's "עקביות טכנית" requirement.

/** Vercel/Linear-style premium ease-out - a soft landing at the end of a transition. */
export const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.2,
  base: 0.3,
  entrance: 0.5,
  slow: 0.8,
} as const;

/** Delay between successive items in a staggered entrance (e.g. the 4 daily idea cards). */
export const STAGGER_STEP = 0.1;

/** Standard "fade up" entrance: opacity 0->1, y 12->0. Spread into a <motion.* variants> prop. */
export const FADE_UP = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
} as const;

export const FADE_UP_TRANSITION = { duration: DURATION.entrance, ease: EASE_PREMIUM } as const;

/** SparkButton's rising loading particles: how long one particle takes to rise and fade,
 * and the delay between successive particles starting their loop. */
export const PARTICLE_RISE_DURATION = 1.1;
export const PARTICLE_STAGGER = 0.25;

// Native drag/animation-event handlers collide with Framer Motion's own onDrag*/onAnimation*
// props (different event signatures) - Omit these from a native element's prop type before
// spreading it onto a motion.* component. Shared here since more than one component needs it.
export type MotionConflictingProps =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragOver"
  | "onDragLeave"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration";
