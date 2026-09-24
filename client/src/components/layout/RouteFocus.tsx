'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Manages focus on client-side (App Router) navigation (Spec 06, AD-609,
 * NFR-605, design §10).
 *
 * In a single-page app, a `next/link` navigation swaps the page content without
 * a full document load, so the browser does **not** reset focus. A keyboard or
 * screen-reader user is left with focus on the (now gone) link they activated,
 * with no announcement of the new page — they are stranded and disoriented.
 *
 * This shell component watches the pathname and, on each change, moves focus to
 * the main landmark (`#main-content`, made focusable via `tabIndex={-1}` on
 * `PageContainer`). Because the landmark is where page content begins, focusing
 * it both re-orients keyboard users to the top of the new page and prompts
 * screen readers to announce the new context. The existing skip link keeps
 * working — it targets the same landmark.
 *
 * The initial render is intentionally skipped: on first load the browser's
 * native focus handling is correct, and stealing focus to the main region on
 * the very first paint would be surprising. Focus is only moved on *subsequent*
 * client-side route changes.
 *
 * Renders nothing; it is a behavioural component mounted once in the shell.
 */
export function RouteFocus(): null {
  const pathname = usePathname();
  // Skip the first pathname value (initial load); only manage focus on change.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // The main landmark is the shell's `PageContainer` (`tabIndex={-1}`), so a
    // stray null only happens if the shell markup changes — degrade quietly
    // rather than throw during navigation.
    const main = document.getElementById('main-content');
    main?.focus();
  }, [pathname]);

  return null;
}
