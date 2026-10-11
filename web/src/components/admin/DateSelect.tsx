"use client";

import { NativeSelect } from "@mantine/core";
import { DAYS_IN_MONTH, MONTHS, parseKey, toKey } from "@/lib/birthday";

type Props = {
  /** "10-07", or "" for no date. */
  value: string;
  onChange: (key: string) => void;
  /** Adds an "All dates" choice (the listings filter). */
  allowAll?: boolean;
  error?: string;
};

/** Month and day, no year: every date has one open board. */
export function DateSelect({ value, onChange, allowAll = false, error }: Props) {
  const md = parseKey(value);
  const month = md?.month ?? 0;
  const days = month ? DAYS_IN_MONTH[month - 1]! : 0;
  return (
    <>
      <NativeSelect
        label="Month"
        value={month ? String(month) : ""}
        onChange={(e) => {
          const next = Number(e.currentTarget.value);
          if (!next) return onChange("");
          onChange(toKey({ month: next, day: Math.min(md?.day ?? 1, DAYS_IN_MONTH[next - 1]!) }));
        }}
        data={[{ value: "", label: allowAll ? "All dates" : "Select" }, ...MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))]}
        error={error}
      />
      <NativeSelect
        label="Day"
        value={md ? String(md.day) : ""}
        disabled={!month}
        onChange={(e) => month && onChange(toKey({ month, day: Number(e.currentTarget.value) }))}
        data={month ? Array.from({ length: days }, (_, i) => String(i + 1)) : [{ value: "", label: "–" }]}
      />
    </>
  );
}
