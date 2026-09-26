/**
 * Confirmation controller (Spec 11 §6, Spec 10 FR-1001).
 *
 * Bridges the registry's async `ConfirmationRequester` (which awaits a boolean)
 * to a rendered React dialog. When a WRITE capability is invoked, the registry
 * calls `requester(request)`; the controller records the pending request, notifies
 * subscribers so the dialog renders, and resolves the awaited promise only when
 * the human approves or declines. Framework-agnostic (no React import) so it is
 * trivially unit-testable.
 */
import type { ConfirmationRequest, ConfirmationRequester } from '@/lib/webmcp';

/** The request currently awaiting a human decision (or null when idle). */
export interface PendingConfirmation {
  readonly request: ConfirmationRequest;
  /** Approve the request (resolves the awaited `confirm` with true). */
  readonly approve: () => void;
  /** Decline/cancel (resolves the awaited `confirm` with false). */
  readonly decline: () => void;
}

type Listener = (pending: PendingConfirmation | null) => void;

export class ConfirmationController {
  private pending: PendingConfirmation | null = null;
  private readonly listeners = new Set<Listener>();

  /**
   * The `ConfirmationRequester` to hand to the capability context. Each call
   * returns a promise that resolves when the human decides. If a prior request is
   * still pending, the new one is declined immediately (one decision at a time).
   */
  readonly requester: ConfirmationRequester = (request) =>
    new Promise<boolean>((resolve) => {
      if (this.pending !== null) {
        // Never queue silent writes; a second concurrent request is declined.
        resolve(false);
        return;
      }
      const settle = (approved: boolean): void => {
        this.pending = null;
        this.emit();
        resolve(approved);
      };
      this.pending = {
        request,
        approve: () => settle(true),
        decline: () => settle(false),
      };
      this.emit();
    });

  /** Current pending confirmation (for the dialog to render), or null. */
  current(): PendingConfirmation | null {
    return this.pending;
  }

  /** Subscribe to pending-state changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.pending);
  }
}
