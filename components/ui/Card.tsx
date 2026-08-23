"use client";

import type { ComponentPropsWithoutRef, ElementType } from "react";
import styles from "./Card.module.css";

export type CardProps<T extends ElementType = "div"> = {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export default function Card<T extends ElementType = "div">({ as, className, ...props }: CardProps<T>) {
  const Component = as ?? "div";
  const classNames = [styles.card, className].filter(Boolean).join(" ");

  return <Component className={classNames} {...props} />;
}
