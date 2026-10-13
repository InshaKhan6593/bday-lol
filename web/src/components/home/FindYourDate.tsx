"use client";

import { useState } from "react";
import { Button, Icon, Select, Surface } from "@/components/ui";
import { dayAfterMonthChange, dayOptions, MONTH_OPTIONS, pickedMonthDay } from "@/lib/date-options";
import { formatUsd } from "@/lib/money";
import { routes } from "@/lib/routes";
import styles from "./home.module.css";

type Props = { openBidCents: number };

/**
 * "Find your birthday", the homepage's closing card: pick a month and a day and
 * go straight to the Claim page with that date filled in. One line on a wide
 * screen (the question, the two lists, the button); on a phone the lists share
 * a row and the button takes the next one.
 */
export function FindYourDate({ openBidCents }: Props) {
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const picked = pickedMonthDay(month, day);

  function pickMonth(value: string) {
    setMonth(value);
    setDay(dayAfterMonthChange(day, value));
  }

  const arrow = <Icon name="arrowRight" size={20} />;

  return (
    <Surface as="section" radius="section" elevation="section" padding="lg" className={styles.finder} aria-labelledby="find-your-date">
      <div className={styles.finderHead}>
        <h2 id="find-your-date" className={styles.finderTitle}>
          Find your birthday
        </h2>
        <p className={styles.finderSub}>Pick your date and claim it right now. Bids start at {formatUsd(openBidCents)}.</p>
      </div>
      <div className={styles.finderForm}>
        <Select
          aria-label="Month"
          options={MONTH_OPTIONS}
          placeholder="Month"
          value={month}
          onValueChange={pickMonth}
          className={styles.finderMonth}
        />
        <Select
          aria-label="Day"
          options={dayOptions(month)}
          placeholder="Day"
          value={day}
          onValueChange={setDay}
          className={styles.finderDay}
        />
        {picked ? (
          <Button href={routes.claim(picked)} size="lg" iconEnd={arrow} className={styles.finderGo}>
            Claim my birthday
          </Button>
        ) : (
          <Button type="button" size="lg" iconEnd={arrow} className={styles.finderGo} disabled>
            Claim my birthday
          </Button>
        )}
      </div>
    </Surface>
  );
}
