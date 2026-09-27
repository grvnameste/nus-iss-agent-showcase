/**
 * Invocation status store (Spec 11 §7, FR-1105.3).
 *
 * A tiny, framework-agnostic observable that tracks the lifecycle of each
 * capability invocation as pending → success | error. It holds **metadata only**
 * (invocation id, capability name, kind, status, optional error message) — never
 * input values, PII, or result bodies (Spec 10 FR-1004). The Spec 14 demo UI
 * subscribes to render tool activity; Spec 11 only defines and populates it.
 */
import type { CapabilityKind } from '@/lib/webmcp';

export type InvocationStatus = 'pending' | 'success' | 'error';

/** A single invocation's status entry — metadata only. */
export interface InvocationEntry {
  readonly id: string;
  readonly capability: string;
  readonly kind: CapabilityKind;
  readonly status: InvocationStatus;
  /** Sanitised, user-safe message for the error state. Never internals/PII. */
  readonly error?: string;
  readonly at: string;
}

type Listener = (entries: readonly InvocationEntry[]) => void;

export class StatusStore {
  private entries: InvocationEntry[] = [];
  private readonly listeners = new Set<Listener>();
  private seq = 0;

  constructor(private readonly max = 100) {}

  /** Begin tracking an invocation; returns its id for later resolution. */
  begin(capability: string, kind: CapabilityKind): string {
    const id = `inv-${(this.seq += 1)}`;
    this.push({ id, capability, kind, status: 'pending', at: new Date().toISOString() });
    return id;
  }

  /** Mark an invocation successful. */
  succeed(id: string): void {
    this.update(id, { status: 'success' });
  }

  /** Mark an invocation failed with a sanitised message (no internals/PII). */
  fail(id: string, error: string): void {
    this.update(id, { status: 'error', error });
  }

  /** Current snapshot (metadata only). */
  list(): readonly InvocationEntry[] {
    return [...this.entries];
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private push(entry: InvocationEntry): void {
    this.entries = [...this.entries, entry].slice(-this.max);
    this.emit();
  }

  private update(id: string, patch: Partial<InvocationEntry>): void {
    this.entries = this.entries.map((e) =>
      e.id === id ? { ...e, ...patch, at: new Date().toISOString() } : e,
    );
    this.emit();
  }

  private emit(): void {
    const snapshot = this.list();
    for (const listener of this.listeners) listener(snapshot);
  }
}
