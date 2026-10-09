"use client";

import { useRef, useState } from "react";
import { BoostDialog, type BoostTarget } from "@/components/boost/BoostDialog";
import { Button, Icon } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { boostBoxTop } from "@/lib/boost";
import { firstName } from "@/lib/people";

type Props = {
  target: BoostTarget;
  otherTotalsCents: number[];
  dateLabel: string;
  theme: ThemeKey;
  settings: Pick<BoardTypeSettings, "boostChipsCents" | "defaultBoostCents" | "minBoostCents">;
  /** Today's end, for the "Today ends in 12 min…" warning. */
  dayEnd: { endsAt: string; serverNow: string };
  className?: string;
};

/** The white "▲ Boost" pill on the homepage #1 card. Opens the Boost box next to itself. */
export function BoostButton({ target, otherTotalsCents, dateLabel, theme, settings, dayEnd, className }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [top, setTop] = useState<number | null>(null);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="paper"
        shape="pill"
        size="md"
        hoverInvert
        aria-label={`Boost ${firstName(target.name)}`}
        iconStart={<Icon name="boost" size={16} />}
        className={className}
        onClick={(e) => setTop(boostBoxTop(e.currentTarget.getBoundingClientRect().top, window.innerHeight))}
      >
        Boost
      </Button>
      <BoostDialog
        target={top === null ? null : target}
        top={top ?? 0}
        onClose={() => {
          setTop(null);
          // Back to the button that opened the box (keyboard users keep their place).
          requestAnimationFrame(() => buttonRef.current?.focus());
        }}
        otherTotalsCents={otherTotalsCents}
        topTotalCents={target.totalCents}
        dateLabel={dateLabel}
        theme={theme}
        settings={settings}
        returnPath="/"
        dayEnd={dayEnd}
      />
    </>
  );
}
