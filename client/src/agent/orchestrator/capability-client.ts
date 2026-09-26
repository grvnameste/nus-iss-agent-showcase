/**
 * Transport-agnostic capability client (Spec 13 §3, FR-1302).
 *
 * The orchestrator plans and dispatches against this small facade — `list()` and
 * `invoke()` — without knowing which interface backs it. In the browser it wraps
 * the Spec 11 WebMCP registry (through the Spec 10 guardrails). A fake
 * implementation backs the deterministic tests. MCP (Spec 12) is reached by
 * external MCP clients, not through this in-app facade.
 *
 * The orchestrator plans only over the capabilities `list()` advertises, so an
 * interface that lacks a capability (e.g. MCP has no `navigate_to_course`) simply
 * yields a smaller list — the journey adapts rather than failing (FR-1302.2).
 */

/** Capability metadata the planner reasons over (name + description only). */
export interface CapabilityInfo {
  readonly name: string;
  readonly description: string;
  readonly kind: 'READ' | 'NAVIGATION' | 'WRITE';
}

export interface CapabilityClient {
  /** The capabilities available on the active interface. */
  list(): readonly CapabilityInfo[];
  /** Invoke a capability by name; rejects with the pipeline's typed errors. */
  invoke(name: string, input: unknown): Promise<unknown>;
}
