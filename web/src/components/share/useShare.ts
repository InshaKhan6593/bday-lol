"use client";

import { useCopy } from "./useCopy";

/** The phone's share sheet when there is one, otherwise copy the link. */
export function useShare() {
  const { copied, copy } = useCopy();

  async function share(url: string, message: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: message, text: message, url });
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    await copy(url);
  }

  return { copied, copy, share };
}
