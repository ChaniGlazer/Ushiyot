"use client";

import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ElementType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SPRING_SOFT, type MotionConflictingProps } from "@/lib/motion";
import Spinner from "./Spinner";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost-danger";
export type ButtonSize = "md" | "sm";

type OwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button - the loading label itself is still passed via children. */
  isLoading?: boolean;
};

export type ButtonProps<T extends ElementType = "button"> = {
  as?: T;
} & OwnProps &
  Omit<ComponentPropsWithoutRef<T>, keyof OwnProps | "as">;

export default function Button<T extends ElementType = "button">({
  as,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps<T>) {
  const Component = as ?? "button";
  const classNames = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");
  const prefersReducedMotion = useReducedMotion();

  // Depth-on-hover + press feedback only applies to the plain <button> case (see module docs) -
  // an arbitrary polymorphic `as` (e.g. Link-styled-as-button) renders unanimated, unchanged.
  if (Component === "button") {
    return (
      <motion.button
        className={classNames}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        whileHover={prefersReducedMotion || disabled || isLoading ? undefined : { y: -3, scale: 1.015 }}
        whileTap={prefersReducedMotion || disabled || isLoading ? undefined : { scale: 0.97 }}
        transition={SPRING_SOFT}
        {...(props as Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionConflictingProps>)}
      >
        {isLoading && <Spinner />}
        {children}
      </motion.button>
    );
  }

  // Polymorphic `as` components are a known hard case for TS's JSX inference
  // (LibraryManagedAttributes<T, any> can't be derived losslessly from a generic T here); the
  // public API (ButtonProps<T>) stays fully typed, this cast is scoped to just this one spread.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polymorphicProps = props as any;

  return (
    <Component className={classNames} {...polymorphicProps}>
      {isLoading && <Spinner />}
      {children}
    </Component>
  );
}
