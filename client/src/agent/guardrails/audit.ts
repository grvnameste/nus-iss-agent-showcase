/**
 * PII-free audit (Spec 10 §9, FR-1007).
 *
 * One structured record per capability invocation, capturing metadata ONLY —
 * capability name, kind, outcome, whether confirmation was granted, and a
 * timestamp. It NEVER records input values, message text, or any PII
 * (FR-1004/FR-1007). The sink is an interface so WebMCP (Spec 11) and MCP
 * (Spec 12) can route records to their own logger without changing this shape.
 */
import type { CapabilityKind } from '@/lib/webmcp';

/** Terminal outcome of a guarded invocation. */
export type AuditOutcome =
  | 'success'
  | 'validation_error'
  | 'declined'
  | 'duplicate'
  | 'error';

/** Metadata-only audit record. No values, no PII — ever. */
export interface AuditRecord {
  readonly capability: string;
  readonly kind: CapabilityKind;
  readonly outcome: AuditOutcome;
  /** Present only for capabilities that require confirmation (WRITE). */
  readonly confirmationGranted?: boolean;
  /** ISO timestamp. */
  readonly at: string;
}

/** Where audit records are sent. Implementations must not add PII. */
export interface AuditSink {
  record(entry: AuditRecord): void;
}

/**
 * Default in-memory sink for the demo/tests. Keeps a bounded ring of records so
 * a demo panel can show recent activity without ever holding PII.
 */
export class InMemoryAuditSink implements AuditSink {
  private readonly entries: AuditRecord[] = [];
  constructor(private readonly max = 100) {}

  record(entry: AuditRecord): void {
    this.entries.push(entry);
    if (this.entries.length > this.max) this.entries.shift();
  }

  /** Snapshot of recorded entries (metadata only). */
  list(): readonly AuditRecord[] {
    return [...this.entries];
  }
}

/** A no-op sink for callers that do not want audit output. */
export const noopAuditSink: AuditSink = { record: () => {} };
