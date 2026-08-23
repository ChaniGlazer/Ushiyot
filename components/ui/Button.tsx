"use client";

import type { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button - the loading label itself is still passed via children. */
  isLoading?: boolean;
};

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classNames = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");

  return (
    <button className={classNames} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
      {isLoading && <Spinner />}
      {children}
    </button>
  );
}
