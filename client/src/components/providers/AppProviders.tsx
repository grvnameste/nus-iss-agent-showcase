'use client';

import type { ReactNode } from 'react';
import { ComparisonProvider } from '@/components/comparison/comparison-context';
import { NotificationProvider } from '@/components/notifications/notification-context';

/**
 * Integration-owned composition of the cross-feature client providers
 * (Specification 06, AD-601, design §3).
 *
 * Mounted once inside the Spec 01 shell so every route shares the same
 * comparison state (Spec 04's `ComparisonProvider`, FR-623, CQ-4) and the same
 * global notification channel (Spec 06's `NotificationProvider`, FR-621, CQ-5).
 *
 * This wrapper contains **no business logic** — it is context composition only.
 * Feature internals (including the comparison provider) are consumed here and
 * never modified (NFR-601).
 */
export function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <ComparisonProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </ComparisonProvider>
  );
}
