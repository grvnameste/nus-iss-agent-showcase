/**
 * WebMCP adapter (Spec 11 §4–§5, §7).
 *
 * Binds the shared capability registry (Spec 09) to the browser WebMCP surface:
 * it registers the capabilities, advertises them as tools to the detected
 * surface, and routes each tool call through `invokeWithGuardrails` (Spec 10) so
 * validation, human confirmation, duplicate protection, and PII-free audit all
 * apply uniformly. When no WebMCP surface is present it is a **graceful no-op** —
 * the human website is untouched (FR-1101).
 *
 * The adapter contains no business logic; it wires the existing pieces together.
 */
import {
  CapabilityRegistry,
  createBrowserTransport,
  resolveApiBaseUrl,
  type CapabilityContext,
  type CapabilityTransport,
  type ConfirmationRequester,
} from '@/lib/webmcp';
import { registerWebMcpCapabilities } from '@/agent/capabilities';
import {
  invokeWithGuardrails,
  type AuditSink,
  type DuplicateSubmissionGuard,
} from '@/agent/guardrails';
import { detectWebMcp, type WebMcpSurface } from './detect';
import { StatusStore } from './status-store';

export interface WebMcpInit {
  /** Human confirmation requester (rendered dialog in the provider). */
  readonly confirm: ConfirmationRequester;
  /** Client-side navigation used by `navigate_to_course`. */
  readonly navigateToCourse: (courseId: string) => string;
  /** Optional overrides (tests inject a fake transport / surface). */
  readonly transport?: CapabilityTransport;
  readonly surface?: WebMcpSurface | null;
  readonly audit?: AuditSink;
  readonly duplicateGuard?: DuplicateSubmissionGuard;
  readonly statusStore?: StatusStore;
}

export interface WebMcpHandle {
  /** Whether a WebMCP surface was detected and tools were advertised. */
  readonly available: boolean;
  /** The registry the capabilities were registered against. */
  readonly registry: CapabilityRegistry;
  /** The status store observing invocations (for the demo UI). */
  readonly statusStore: StatusStore;
  /** Invoke a capability through the guardrailed pipeline (used by the surface). */
  invoke(name: string, input: unknown): Promise<unknown>;
}

/**
 * Initialise the WebMCP layer. Always registers the capabilities and returns a
 * handle; only advertises tools to the browser when a surface is detected.
 */
export function initWebMcp(init: WebMcpInit): WebMcpHandle {
  const registry = new CapabilityRegistry();
  registerWebMcpCapabilities(registry, { navigateToCourse: init.navigateToCourse });

  const transport =
    init.transport ?? createBrowserTransport({ baseUrl: resolveApiBaseUrl() });
  const statusStore = init.statusStore ?? new StatusStore();

  const ctx: CapabilityContext = { transport, confirm: init.confirm };

  const invoke = async (name: string, input: unknown): Promise<unknown> => {
    const kind = registry.get(name)?.permissions.kind ?? 'READ';
    const id = statusStore.begin(name, kind);
    try {
      const result = await invokeWithGuardrails(registry, name, input, ctx, {
        ...(init.audit ? { audit: init.audit } : {}),
        ...(init.duplicateGuard ? { duplicateGuard: init.duplicateGuard } : {}),
      });
      statusStore.succeed(id);
      return result;
    } catch (error) {
      // Sanitised, user-safe message only — no internals reach the status store.
      statusStore.fail(id, toSafeMessage(error));
      throw error;
    }
  };

  // Detect (unless a surface is explicitly injected for tests).
  const surface = init.surface !== undefined ? init.surface : detectWebMcp();

  if (surface) {
    for (const capability of registry.list()) {
      surface.registerTool(
        {
          name: capability.name,
          description: capability.description,
          inputSchema: capability.inputSchema,
        },
        (input) => invoke(capability.name, input),
      );
    }
  }

  return { available: surface !== null, registry, statusStore, invoke };
}

/** Map any thrown error to a short, user-safe message (no internals/PII). */
function toSafeMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'ConfirmationDeniedError') {
    return 'Confirmation was declined.';
  }
  if (error instanceof Error && error.name === 'DuplicateSubmissionError') {
    return 'This enquiry was already submitted.';
  }
  if (error instanceof Error && error.name === 'CapabilityValidationError') {
    return 'The request was invalid.';
  }
  return 'The action could not be completed.';
}
