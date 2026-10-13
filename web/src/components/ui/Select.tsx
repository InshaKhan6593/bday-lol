"use client";

import { Select as RadixSelect } from "radix-ui";
import { useRef } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";
import styles from "./Select.module.css";

/** `disabled` greys a row out, e.g. a gift app already used in another row. */
export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shown when nothing is picked, e.g. "Select" or "–". */
  placeholder?: string;
  /** Submits with forms like a native select. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
  /**
   * Always open under the box, never above it. For a list near the bottom of a
   * page, where the usual "open wherever there is room" sends it upwards over
   * the content: the page scrolls up to make the room instead.
   */
  opensDown?: boolean;
};

/** Room a full list needs under its box: the list (320px), its gap and the edge padding. */
const MENU_ROOM = 344;

/**
 * Dropdown in the design language: the closed box looks like every other
 * control, and the open list is a white menu panel with an ink outline and a
 * hard shadow (same as the "Send a gift" menu). Built on Radix Select for
 * keyboard, screen reader and touch support.
 *
 * The list renders in place (no portal) so it inherits the page theme's
 * --ground and --accent. A long list (months, days) scrolls like any list: Radix's
 * hover-to-scroll arrows are left out, because they appear and vanish while
 * scrolling and made the list jump.
 */
export function Select({ options, placeholder, className, "aria-label": ariaLabel, id, opensDown = false, ...root }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);

  // A list that must open downwards gets its room from the page: scroll just far enough to fit it.
  function makeRoom(open: boolean) {
    if (!open || !opensDown || !trigger.current) return;
    const short = trigger.current.getBoundingClientRect().bottom + MENU_ROOM - window.innerHeight;
    if (short > 0) window.scrollBy({ top: short, behavior: "instant" });
  }

  return (
    <RadixSelect.Root {...root} onOpenChange={makeRoom}>
      <RadixSelect.Trigger ref={trigger} id={id} aria-label={ariaLabel} className={cx(styles.trigger, className)}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className={styles.chevron}>
          <Icon name="chevronDown" size={16} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Content
        position="popper"
        side="bottom"
        avoidCollisions={!opensDown}
        sideOffset={8}
        collisionPadding={16}
        className={styles.menu}
      >
        <RadixSelect.Viewport className={styles.viewport}>
          {options.map((option) => (
            <RadixSelect.Item key={option.value} value={option.value} disabled={option.disabled} className={styles.item}>
              <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              <RadixSelect.ItemIndicator className={styles.check}>
                <Icon name="check" size={16} />
              </RadixSelect.ItemIndicator>
            </RadixSelect.Item>
          ))}
        </RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Root>
  );
}
