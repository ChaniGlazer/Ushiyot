"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import styles from "./Select.module.css";

/**
 * A fully custom listbox, not a native <select> - browsers render a native <select>'s open
 * dropdown themselves (the OS/browser popup), which ignores most CSS and shows up as a jarring
 * light-themed list regardless of the site's own dark styling. This keeps the exact same
 * <Select><option value="x">label</option></Select> call shape (so existing call sites don't
 * change), but renders every part of the open state itself.
 */
export type SelectProps = {
  label?: string;
  error?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  id?: string;
  className?: string;
  children: ReactNode;
};

type Option = { value: string; label: ReactNode };

function extractOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<{ value?: string; children?: ReactNode }>(child) && child.props.value !== undefined) {
      options.push({ value: child.props.value, label: child.props.children });
    }
  });
  return options;
}

export default function Select({ label, error, value, onChange, id, className, children }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const listboxId = `${selectId}-listbox`;

  const options = useMemo(() => extractOptions(children), [children]);
  const selectedIndex = options.findIndex((option) => option.value === value);

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(Math.max(0, selectedIndex));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function fireChange(newValue: string) {
    onChange({ target: { value: newValue } } as unknown as ChangeEvent<HTMLSelectElement>);
  }

  function selectHighlighted() {
    const option = options[highlightedIndex];
    if (option) fireChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectHighlighted();
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
  }

  const selectedLabel = options[selectedIndex]?.label;

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper} ref={wrapperRef}>
        <button
          type="button"
          id={selectId}
          ref={triggerRef}
          className={[styles.select, error ? styles.selectError : "", className].filter(Boolean).join(" ")}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? `${selectId}-option-${highlightedIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => {
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
            setOpen((o) => !o);
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <span className={styles.selectLabel}>{selectedLabel}</span>
          <svg className={styles.chevron} width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              id={listboxId}
              role="listbox"
              aria-labelledby={label ? selectId : undefined}
              className={styles.panel}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: DURATION.fast, ease: EASE_PREMIUM }}
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${selectId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  className={[
                    styles.option,
                    index === highlightedIndex ? styles.optionHighlighted : "",
                    option.value === value ? styles.optionSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    fireChange(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  {option.label}
                  {option.value === value && (
                    <span className={styles.checkmark} aria-hidden="true">
                      ✓
                    </span>
                  )}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
