'use client';

import type { ReactNode } from 'react';
import { ComparisonProvider } from '@/components/comparison/comparison-context';
import { NotificationProvider } from '@/components/notifications/notification-context';
import { AgentProvider } from '@/agent/webmcp';

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
 *
 * The Spec 11 `AgentProvider` mounts the WebMCP capability layer once on the
 * client. It is purely additive and degrades gracefully: with no WebMCP browser
 * surface it registers the capabilities for potential in-app use and renders only
 * an idle confirmation host, leaving every human journey unchanged (FR-1101,
 * FR-1106).
 */
export function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <ComparisonProvider>
      <NotificationProvider>
        <AgentProvider>{children}</AgentProvider>
      </NotificationProvider>
    </ComparisonProvider>
  );
}
