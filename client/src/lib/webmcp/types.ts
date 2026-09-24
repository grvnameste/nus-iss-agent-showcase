import type { z } from 'zod';

/**
 * WebMCP capability layer — core types.
 *
 * This module defines the typed contract for "Agent Ready" capabilities. A
 * capability is a named, permissioned, schema-validated operation that an agent
 * (or the app itself) can invoke. Capabilities describe *what* can be done and
 * *how it is classified*; they never contain business logic. Execution is
 * delegated to a transport/adapter (see `adapter.ts`), which in turn calls the
 * backend REST API where the real business logic lives.
 */

/**
 * The kind of operation a capability performs. Agents and UIs must be able to
 * distinguish these so that side-effecting actions are treated differently from
 * safe reads.
 *
 * - READ:       Retrieves data. No side effects. Safe to call speculatively.
 * - NAVIGATION: Moves the user/agent through the app (e.g. routing). No data
 *               mutation, but changes application location/context.
 * - WRITE:      Mutates state on the backend (e.g. submitting an enquiry).
 *               Always side-effecting and must be validated server-side.
 */
export type CapabilityKind = 'READ' | 'NAVIGATION' | 'WRITE';

/**
 * Explicit permissions a capability requires. Every capability MUST declare its
 * permissions; there is no implicit or ambient authority. A host decides
 * whether to grant a capability based on these.
 */
export interface CapabilityPermissions {
  /** Operation classification. Drives confirmation and safety policy. */
  readonly kind: CapabilityKind;
  /**
   * Whether invoking this capability requires explicit human confirmation
   * before it runs. WRITE operations that submit data (e.g. enquiry
   * submission) MUST set this to true.
   */
  readonly requiresHumanConfirmation: boolean;
  /**
   * Coarse-grained scopes this capability touches (e.g. "courses:read",
   * "enquiry:write"). Used for auditing and future authorization.
   */
  readonly scopes: readonly string[];
}

/**
 * A fully typed capability definition. Input and output are validated with Zod
 * schemas so that both the app and any agent get runtime guarantees.
 */
export interface CapabilityDefinition<TInput, TOutput> {
  /** Stable, unique identifier, e.g. "courses.search". */
  readonly name: string;
  /** Human/agent readable description of what the capability does. */
  readonly description: string;
  /** Declared permissions. Required for every capability. */
  readonly permissions: CapabilityPermissions;
  /** Zod schema validating the input before execution. */
  readonly inputSchema: z.ZodType<TInput>;
  /** Zod schema validating the output after execution. */
  readonly outputSchema: z.ZodType<TOutput>;
  /**
   * Execute the capability. Implementations delegate to the transport/adapter
   * and MUST NOT embed business logic. Kept as a plain function so capabilities
   * remain environment-agnostic and testable.
   */
  readonly execute: (input: TInput, ctx: CapabilityContext) => Promise<TOutput>;
}

/**
 * Runtime context handed to a capability at execution time. Provides the
 * transport used to reach the backend and a hook to obtain human confirmation.
 */
export interface CapabilityContext {
  /** Transport for reaching backend business logic. */
  readonly transport: CapabilityTransport;
  /**
   * Requests explicit human confirmation. The registry invokes this for
   * capabilities whose permissions require it, before `execute` runs.
   */
  readonly confirm: ConfirmationRequester;
}

/**
 * Transport abstraction the capabilities use to reach the backend. This is the
 * seam that keeps browser-specific concerns behind an adapter (rule 4). A test
 * or server environment can supply a different implementation.
 */
export interface CapabilityTransport {
  /** Perform a backend read. */
  read<T>(path: string, query?: Record<string, unknown>): Promise<T>;
  /** Perform a backend write. The backend independently validates the body. */
  write<T>(path: string, body: unknown): Promise<T>;
}

/**
 * A request for explicit human confirmation of a side-effecting action.
 */
export interface ConfirmationRequest {
  readonly capabilityName: string;
  readonly summary: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Callback that asks a human to confirm an action. Resolves true if the human
 * explicitly approved, false otherwise.
 */
export type ConfirmationRequester = (request: ConfirmationRequest) => Promise<boolean>;

/** Raised when a capability is invoked but human confirmation was declined. */
export class ConfirmationDeniedError extends Error {
  constructor(capabilityName: string) {
    super(`Human confirmation was declined for capability "${capabilityName}".`);
    this.name = 'ConfirmationDeniedError';
  }
}

/** Raised when input or output schema validation fails. */
export class CapabilityValidationError extends Error {
  constructor(
    capabilityName: string,
    public readonly phase: 'input' | 'output',
    public readonly issues: unknown,
  ) {
    super(`Validation failed (${phase}) for capability "${capabilityName}".`);
    this.name = 'CapabilityValidationError';
  }
}
