'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { courseDetailsHref } from '@/agent/capabilities';
import { useSafeRouter } from './use-safe-router';
import { InMemoryAuditSink, DuplicateSubmissionGuard } from '@/agent/guardrails';
import { initWebMcp, type WebMcpHandle } from './webmcp-adapter';
import { ConfirmationController, type PendingConfirmation } from './confirm/confirmation-controller';
import { ConfirmationDialog } from './confirm/ConfirmationDialog';

/**
 * Agent provider (Spec 11 §2, §5, §8).
 *
 * Mounts the WebMCP layer once on the client: it detects the browser WebMCP
 * surface, registers the Spec 09 capabilities, wires the Spec 10 guardrails
 * (audit + duplicate protection) and the human-confirmation dialog, and — only
 * when a surface is present — advertises the tools to the agent host.
 *
 * It is **purely additive**: with no WebMCP surface it initialises the registry
 * for potential in-app use and renders nothing but an (idle) confirmation host,
 * so the human website is completely unaffected (graceful fallback, FR-1101).
 */
export function AgentProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useSafeRouter();
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  // Stable singletons for the lifetime of the provider.
  const controllerRef = useRef<ConfirmationController>();
  if (!controllerRef.current) controllerRef.current = new ConfirmationController();
  const controller = controllerRef.current;

  const auditRef = useRef<InMemoryAuditSink>();
  if (!auditRef.current) auditRef.current = new InMemoryAuditSink();

  const guardRef = useRef<DuplicateSubmissionGuard>();
  if (!guardRef.current) guardRef.current = new DuplicateSubmissionGuard();

  const handleRef = useRef<WebMcpHandle | null>(null);

  // Reflect the controller's pending state into React so the dialog renders.
  useEffect(() => controller.subscribe(setPending), [controller]);

  useEffect(() => {
    // Router push is a side effect; the capability returns the resolved href.
    const navigateToCourse = (courseId: string): string => {
      const href = courseDetailsHref(courseId);
      router.push(href);
      return href;
    };

    handleRef.current = initWebMcp({
      confirm: controller.requester,
      navigateToCourse,
      audit: auditRef.current,
      duplicateGuard: guardRef.current,
    });
    // Registry/handle live for the page session; nothing to tear down explicitly
    // (no timers, no listeners on window).
  }, [controller, router]);

  // The provider does not create React context yet (no in-app consumers until the
  // Spec 14 demo UI); it exists to initialise the layer and host the dialog.

  return (
    <>
      {children}
      <ConfirmationDialog pending={pending} />
    </>
  );
}
