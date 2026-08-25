"use client";

import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ElementType } from "react";
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
  const extraProps: Partial<ButtonHTMLAttributes<HTMLButtonElement>> =
    Component === "button" ? { disabled: disabled || isLoading, "aria-busy": isLoading || undefined } : {};

  return (
    <Component className={classNames} {...extraProps} {...props}>
      {isLoading && <Spinner />}
      {children}
    </Component>
  );
}
