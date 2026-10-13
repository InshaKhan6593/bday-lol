"use client";

import { Select } from "@mantine/core";
import { DAYS_IN_MONTH, MONTHS, parseKey, toKey } from "@/lib/birthday";
import classes from "./admin.module.css";

type Props = {
  /** "10-07", or "" for no date. */
  value: string;
  onChange: (key: string) => void;
  /** Adds an "All dates" choice (the listings filter). */
  allowAll?: boolean;
  error?: string;
  /** Fixed, narrow boxes for a filter row. Otherwise each box fills its column. */
  compact?: boolean;
};

const ALL = "all";

/** The list always opens downwards and scrolls, like the site's own Month and Day lists. */
const LIST = {
  allowDeselect: false,
  maxDropdownHeight: 264,
  comboboxProps: { position: "bottom-start", middlewares: { flip: false, shift: false }, withinPortal: true },
  classNames: { dropdown: classes.listPanel, option: classes.listOption },
} as const;

/** Month and day, no year: every date has one open board. */
export function DateSelect({ value, onChange, allowAll = false, error, compact = false }: Props) {
  const md = parseKey(value);
  const month = md?.month ?? 0;
  const days = month ? DAYS_IN_MONTH[month - 1]! : 0;
  const months = MONTHS.map((name, i) => ({ value: String(i + 1), label: name }));
  return (
    <>
      <Select
        {...LIST}
        label="Month"
        placeholder="Select"
        value={month ? String(month) : allowAll ? ALL : null}
        onChange={(picked) => {
          const next = Number(picked);
          if (!next) return onChange("");
          onChange(toKey({ month: next, day: Math.min(md?.day ?? 1, DAYS_IN_MONTH[next - 1]!) }));
        }}
        data={allowAll ? [{ value: ALL, label: "All dates" }, ...months] : months}
        error={error}
        w={compact ? 160 : undefined}
        className={compact ? classes.filterGrow : undefined}
      />
      <Select
        {...LIST}
        label="Day"
        placeholder="–"
        value={md ? String(md.day) : null}
        disabled={!month}
        onChange={(picked) => month && picked && onChange(toKey({ month, day: Number(picked) }))}
        data={Array.from({ length: days }, (_, i) => String(i + 1))}
        w={compact ? 96 : undefined}
        className={compact ? classes.filterGrow : undefined}
      />
    </>
  );
}
