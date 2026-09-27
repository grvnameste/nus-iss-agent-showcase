/**
 * WebMCP detection (Spec 11 §3, FR-1101).
 *
 * WebMCP is an emerging browser capability with no finalised standard binding, so
 * detection is isolated here behind a typed guard. The rest of the layer depends
 * only on the small {@link WebMcpSurface} shape below — if/when the real browser
 * API stabilises, only this module changes.
 *
 * Detection never throws and never touches the DOM beyond a guarded property
 * read, so calling it on the server or in an unsupported browser is safe and
 * simply yields `null` (graceful fallback: the human site is untouched).
 */

/** A tool advertised to the browser WebMCP surface (metadata only). */
export interface WebMcpToolDescriptor {
  readonly name: string;
  readonly description: string;
  /** JSON-schema-like description of inputs; kept as unknown to stay binding-agnostic. */
  readonly inputSchema?: unknown;
}

/**
 * The minimal surface this layer expects a WebMCP-capable browser to expose. This
 * is intentionally small and defensive; the concrete browser API is still
 * emerging, so we depend on the least it must provide.
 */
export interface WebMcpSurface {
  /** Advertise a callable tool and its handler to the agent host. */
  registerTool(
    descriptor: WebMcpToolDescriptor,
    handler: (input: unknown) => Promise<unknown>,
  ): void;
}

/** Shape we probe for on `navigator`. Optional + unknown-guarded. */
interface NavigatorWithWebMcp {
  readonly modelContext?: {
    readonly registerTool?: unknown;
  };
}

/**
 * Feature-detect a WebMCP surface. Returns a typed handle when the browser
 * exposes a usable surface, otherwise `null`. Never throws.
 */
export function detectWebMcp(): WebMcpSurface | null {
  // Guard for non-browser environments (SSR, tests without a navigator).
  if (typeof navigator === 'undefined') return null;

  const candidate = (navigator as unknown as NavigatorWithWebMcp).modelContext;
  if (
    candidate === undefined ||
    candidate === null ||
    typeof candidate.registerTool !== 'function'
  ) {
    return null;
  }

  // Narrow to the surface we rely on. The cast is confined to this module.
  const registerTool = candidate.registerTool as WebMcpSurface['registerTool'];
  return {
    registerTool: (descriptor, handler) => registerTool(descriptor, handler),
  };
}

/** Convenience predicate for callers that only need a yes/no. */
export function isWebMcpAvailable(): boolean {
  return detectWebMcp() !== null;
}
