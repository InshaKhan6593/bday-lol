"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

/** Time to cross the gap between the button and the menu before it closes. */
const HOVER_CLOSE_MS = 120;

/**
 * Open state for the row menus ("Send a gift ▾", share): with a mouse they open
 * on hover (or click); on touch a tap toggles them. Radix closes them on an
 * outside click or Escape. Spread `triggerProps` on the button and
 * `contentProps` on the menu.
 */
export function useHoverMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const hover = (next: boolean) => (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    if (next) setOpen(true);
    else closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };

  return {
    open,
    setOpen,
    triggerProps: {
      onPointerEnter: hover(true),
      onPointerLeave: hover(false),
      // Hover already opened it: a click must not toggle it shut again.
      onPointerDown: (event: PointerEvent) => {
        if (event.pointerType === "mouse" && open) event.preventDefault();
      },
    },
    contentProps: { onPointerEnter: hover(true), onPointerLeave: hover(false) },
  };
}
