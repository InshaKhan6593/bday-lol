import Link from "next/link";
import type { CSSProperties } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Kicker, Surface, ThemeScope } from "@/components/ui";
import { getTheme } from "@/config/themes";
import { monthIntro } from "@/lib/about";
import { compareMonthDay, formatLongNb, MONTHS } from "@/lib/birthday";
import { commonness } from "@/lib/commonness";
import { cx } from "@/lib/cx";
import { calendarCells } from "@/lib/date-page";
import { birthFlower, birthstone, ordinal, signsInMonth, zodiacSign } from "@/lib/facts";
import { formatUsd } from "@/lib/money";
import { shortName } from "@/lib/people";
import { routes } from "@/lib/routes";
import type { MonthPageData } from "@/server/month-page";
import dateStyles from "@/components/date/date.module.css";
import styles from "./month.module.css";

/** A month page (/october): the hub that links every date in the month (07 B13, 06-seo.md). Always Butter. */
export function MonthPageView({ page }: { page: MonthPageData }) {
  const { month, rows, settings } = page;
  const name = MONTHS[month - 1]!;
  const prev = month === 1 ? 12 : month - 1;
  const next = month === 12 ? 1 : month + 1;
  const signs = signsInMonth(month, rows.length);
  // No date is "selected" on a month page; today's cell gets today's #1 color like the picker.
  const cells = calendarCells(month, page.calendarTops, { month: 0, day: 0 }, page.today);
  const todayStyle = { "--today-ground": getTheme(page.todayTheme).ground } as CSSProperties;

  return (
    <ThemeScope theme={settings.defaultTheme} paint>
      <SiteHeader current="find" />
      <main className={styles.main}>
        <div className={styles.hero}>
          <Kicker size="md">Birthdays by month</Kicker>
          <h1 className={styles.h1}>{name} birthdays</h1>
          <p className={styles.intro}>{monthIntro(month, rows.length, page.claimed).join(" ")}</p>
        </div>

        <Surface radius="section" elevation="section" padding="none" className={styles.calendarCard}>
          <h2 className={styles.h2}>Top bid on every {name} date</h2>
          <div className={dateStyles.calGrid} style={todayStyle}>
            {cells.map((cell) => (
              <Link
                key={cell.md.day}
                href={routes.date(cell.md)}
                aria-label={cell.aria}
                className={cx(dateStyles.cell, "lift", cell.state === "today" && dateStyles.cellToday)}
              >
                <span className={dateStyles.cellNum}>{cell.md.day}</span>
                <span className={dateStyles.cellSub}>{cell.sub}</span>
              </Link>
            ))}
          </div>
          <p className={dateStyles.calNote}>Under each date: the current top bid. Open dates start at {formatUsd(settings.minOpenBidCents)}.</p>
        </Surface>

        <section aria-labelledby="all-dates" className={styles.section}>
          <h2 id="all-dates" className={styles.h2}>
            Every {name} birthday
          </h2>
          <ul className={styles.dates}>
            {rows.map(({ md, leader, famous }) => {
              const c = commonness(md);
              const isToday = compareMonthDay(md, page.today) === 0;
              return (
                <li key={md.day}>
                  <Link href={routes.date(md)} className={cx(styles.dateRow, "lift")}>
                    <span className={styles.dateMain}>
                      <span className={styles.dateName}>
                        {formatLongNb(md)}
                        {isToday && <span className={styles.todayTag}>Today</span>}
                      </span>
                      <span className={styles.dateMeta}>
                        {zodiacSign(md)} · {c.rank === 366 ? "rarest birthday" : `${ordinal(c.rank)} most common`}
                        {famous.length > 0 && <> · Famous birthdays: {famous.join(", ")}</>}
                      </span>
                    </span>
                    <span className={styles.dateLeader}>
                      {leader ? (
                        <>
                          <span className={styles.leaderName}>#1 {shortName(leader.name)}</span>
                          <span className={styles.leaderTotal}>{formatUsd(leader.totalCents)}</span>
                        </>
                      ) : (
                        <span className={styles.open}>Open</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className={dateStyles.factGrid}>
          <Surface padding="none" className={dateStyles.fact}>
            <span className={dateStyles.factKey}>Birthstone</span>
            <span className={dateStyles.factValue}>{birthstone(month)}</span>
            <span className={dateStyles.factSub}>{name} birthstone</span>
          </Surface>
          <Surface padding="none" className={dateStyles.fact}>
            <span className={dateStyles.factKey}>Birth flower</span>
            <span className={dateStyles.factValue}>{birthFlower(month)}</span>
            <span className={dateStyles.factSub}>{name} birth flower</span>
          </Surface>
          <Surface padding="none" className={dateStyles.fact}>
            <span className={dateStyles.factKey}>Star signs</span>
            <span className={dateStyles.factValue}>{signs.map((s) => s.sign).join(" · ")}</span>
            <span className={dateStyles.factSub}>
              {signs.map((s) => `${s.sign} ${s.from}–${s.to}`).join(", ")}
            </span>
          </Surface>
        </div>
        <p className={dateStyles.source}>Commonness: FiveThirtyEight (CDC/NCHS, SSA), US births 1994–2014.</p>

        <nav aria-label="Other months" className={dateStyles.dayLinks}>
          <Link href={routes.month(prev)}>← {MONTHS[prev - 1]}</Link>
          <Link href={routes.month(next)}>{MONTHS[next - 1]} →</Link>
        </nav>
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
