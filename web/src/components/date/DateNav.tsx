"use client";

import Link from "next/link";
import { Popover } from "radix-ui";
import { useEffect, useState, type CSSProperties } from "react";
import { Button, Icon, IconButton } from "@/components/ui";
import { getTheme, type ThemeKey } from "@/config/themes";
import { compareMonthDay, MONTHS, type MonthDay } from "@/lib/birthday";
import { cx } from "@/lib/cx";
import { adjacentDay, calendarCells } from "@/lib/date-page";
import { routes } from "@/lib/routes";
import styles from "./date.module.css";

type Props = {
  md: MonthDay;
  today: MonthDay;
  todayTheme: ThemeKey;
  /** Top total per month-day ("10-07" → cents). */
  calendarTops: Record<string, number>;
};

/** Window event that opens the date picker. */
export const OPEN_DATE_PICKER = "mybday:open-date-picker";

/**
 * Whether the picker is open, kept outside the component: each date is its own page, so the
 * component starts again on every date change, and the picker must still be open when it does.
 * A full page load starts closed.
 */
let pickerOpen = false;

/** ◀ Pick a date ▶ and "Back to today". The picker shows every date's current top bid. */
export function DateNav({ md, today, todayTheme, calendarTops }: Props) {
  const [open, setOpenState] = useState(pickerOpen);
  const setOpen = (next: boolean) => {
    pickerOpen = next;
    setOpenState(next);
  };
  const [month, setMonth] = useState(md.month);
  const isToday = compareMonthDay(md, today) === 0;

  // The picker stays open while dates change behind it: when the date shown changes, show its month.
  const dateKey = `${md.month}-${md.day}`;
  const [shownFor, setShownFor] = useState(dateKey);
  if (shownFor !== dateKey) {
    setShownFor(dateKey);
    setMonth(md.month);
  }
  const pickerStyle = { "--today-ground": getTheme(todayTheme).ground } as CSSProperties;

  function toggle(next: boolean) {
    setOpen(next);
    // Each time it opens, start on the month being viewed.
    if (next) setMonth(md.month);
  }

  // "Find your birthday →" on a followed personal link opens the picker from elsewhere on the page.
  useEffect(() => {
    const openPicker = () => {
      setMonth(md.month);
      setOpen(true);
    };
    window.addEventListener(OPEN_DATE_PICKER, openPicker);
    return () => window.removeEventListener(OPEN_DATE_PICKER, openPicker);
  }, [md.month]);


  return (
    <Popover.Root open={open} onOpenChange={toggle}>
      <Popover.Anchor asChild>
        <div className={styles.nav} data-date-nav>
          <IconButton href={routes.date(adjacentDay(md, -1))} icon="chevronLeft" label="Previous day" />
          <Popover.Trigger asChild>
            <Button variant="paper" className={styles.pickDate} iconStart={<Icon name="calendar" size={20} />}>
              Pick a date
            </Button>
          </Popover.Trigger>
          <IconButton href={routes.date(adjacentDay(md, 1))} icon="chevronRight" label="Next day" />
          {!isToday && (
            <Link href={routes.date(today)} className={styles.backToday}>
              Back to today
            </Link>
          )}
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          collisionPadding={16}
          aria-label="Pick a date"
          className={styles.calendar}
          style={pickerStyle}
          // The picker itself takes focus, not its first button: on phones that drew a ring around "Previous month".
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
          // A click anywhere else closes it, except ◀ ▶ beside "Pick a date": those change the date behind the open picker.
          onInteractOutside={(event) => {
            const target = event.target as Element | null;
            if (target?.closest("[data-date-nav] a")) event.preventDefault();
          }}
        >
          <div className={styles.calHead}>
            <IconButton
              icon="chevronLeft"
              label="Previous month"
              size="md"
              onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))}
            />
            <div className={styles.calMonth} aria-live="polite">
              {MONTHS[month - 1]}
            </div>
            <IconButton icon="chevronRight" label="Next month" size="md" onClick={() => setMonth((m) => (m % 12) + 1)} />
          </div>

          <div className={styles.calGrid}>
            {calendarCells(month, calendarTops, md, today).map((cell) => (
              <Link
                key={cell.md.day}
                href={routes.date(cell.md)}
                // A month of dates: fetched when clicked, not all 30 as soon as they are on screen.
                prefetch={false}
                aria-label={cell.aria}
                aria-current={cell.state === "selected" ? "page" : undefined}
                className={cx(
                  styles.cell,
                  "lift",
                  cell.state === "today" && styles.cellToday,
                  cell.state === "selected" && styles.cellSelected,
                )}
              >
                <span className={styles.cellNum}>{cell.md.day}</span>
                <span className={styles.cellSub}>{cell.sub}</span>
              </Link>
            ))}
          </div>

          <p className={styles.calNote}>Under each date: the current top bid.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
