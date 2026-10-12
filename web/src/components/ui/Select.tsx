"use client";

import { Select as RadixSelect } from "radix-ui";
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
};

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
export function Select({ options, placeholder, className, "aria-label": ariaLabel, id, ...root }: Props) {
  return (
    <RadixSelect.Root {...root}>
      <RadixSelect.Trigger id={id} aria-label={ariaLabel} className={cx(styles.trigger, className)}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className={styles.chevron}>
          <Icon name="chevronDown" size={16} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Content position="popper" sideOffset={8} collisionPadding={16} className={styles.menu}>
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
