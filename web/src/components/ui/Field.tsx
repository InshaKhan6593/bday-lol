import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Field.module.css";

type FieldProps = {
  label: ReactNode;
  /** Muted text next to the label, e.g. "$241 or more to claim the homepage". */
  aside?: ReactNode;
  /** Text under the control. */
  hint?: ReactNode;
  hintTone?: "muted" | "strong" | "error";
  className?: string;
  children: ReactNode;
};

/** Label + control + optional hint, stacked. */
export function Field({ label, aside, hint, hintTone = "muted", className, children }: FieldProps) {
  return (
    <label className={cx(styles.field, className)}>
      <span className={styles.label}>
        {label}
        {aside && <span className={styles.aside}> {aside}</span>}
      </span>
      {children}
      {hint && <span className={cx(styles.hint, styles[`hint-${hintTone}`])}>{hint}</span>}
    </label>
  );
}

type ControlSize = "lg" | "2xl";

export function Input({
  size = "lg",
  emphasis,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: ControlSize; emphasis?: boolean }) {
  return (
    <input
      className={cx(styles.control, styles[`size-${size}`], emphasis && styles.emphasis, className)}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(styles.control, styles.textarea, className)} {...rest} />;
}
