"use client";

import { useId } from "react";
import styles from "./Toggle.module.css";

export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

/**
 * A labeled on/off switch - the knob's position is a plain CSS transition on
 * `inset-inline-start` (not Framer Motion), same reasoning as the app's other logical-property
 * transitions (see dashboard.module.css): a logical property already flips correctly for RTL
 * on its own, where a transform-based slide would need manual sign-flipping to avoid sliding
 * the wrong direction.
 */
export default function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const id = useId();

  return (
    <label className={styles.row} htmlFor={id} data-disabled={disabled || undefined}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`${styles.track} ${checked ? styles.trackOn : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} />
      </button>
    </label>
  );
}
