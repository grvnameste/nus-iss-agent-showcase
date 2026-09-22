import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/**
 * Page container (FR-008): the primary <main> landmark that wraps page content
 * with consistent vertical rhythm and width. Referenced by the layout's skip
 * link (`id="main-content"`).
 *
 * `tabIndex={-1}` makes the landmark programmatically focusable without adding
 * it to the natural tab order. This is the target that `RouteFocus` moves focus
 * to on a client-side route change (Spec 06, AD-609, NFR-605), so keyboard and
 * screen-reader users are re-oriented to the new page instead of being stranded
 * on a stale control. The skip link continues to target the same landmark via
 * its `id`. `outline-none` suppresses a persistent focus ring on this
 * non-interactive container (the visible focus of real controls is unaffected).
 */
export function PageContainer({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-10 outline-none">
      <Container>{children}</Container>
    </main>
  );
}
