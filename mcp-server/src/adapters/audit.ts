/**
 * PII-free audit (Spec 12 §9, FR-1206.3; Spec 10 §9).
 *
 * One metadata-only record per tool invocation — capability, kind, outcome, and
 * (for writes) whether approval was granted. NEVER records enquiry values, message
 * text, or any PII.
 */
export type CapabilityKind = 'READ' | 'NAVIGATION' | 'WRITE';

export type AuditOutcome =
  | 'success'
  | 'validation_error'
  | 'not_found'
  | 'declined'
  | 'duplicate'
  | 'error';

export interface AuditEntry {
  readonly capability: string;
  readonly kind: CapabilityKind;
  readonly outcome: AuditOutcome;
  readonly confirmationGranted?: boolean;
}

export interface AuditSink {
  record(entry: AuditEntry): void;
}

/** In-memory sink (tests / demo). Bounded; metadata only. */
export class InMemoryAuditSink implements AuditSink {
  private readonly entries: Array<AuditEntry & { at: string }> = [];
  constructor(private readonly max = 200) {}
  record(entry: AuditEntry): void {
    this.entries.push({ ...entry, at: new Date().toISOString() });
    if (this.entries.length > this.max) this.entries.shift();
  }
  list(): ReadonlyArray<AuditEntry & { at: string }> {
    return [...this.entries];
  }
}

/**
 * Logger-backed sink. Writes structured, PII-free lines to stderr so it never
 * interferes with the stdio MCP protocol on stdout.
 */
export class StderrAuditSink implements AuditSink {
  record(entry: AuditEntry): void {
    process.stderr.write(`${JSON.stringify({ audit: entry, at: new Date().toISOString() })}\n`);
  }
}
