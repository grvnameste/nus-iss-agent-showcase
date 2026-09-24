import {
  CapabilityValidationError,
  ConfirmationDeniedError,
  type CapabilityContext,
  type CapabilityDefinition,
} from './types';

/**
 * The capability registry.
 *
 * Central, typed catalogue of the app's Agent Ready capabilities. It enforces
 * the cross-cutting policy that every capability must obey — schema validation
 * and explicit human confirmation for side-effecting actions — without knowing
 * anything about the capabilities' domain logic. Business logic stays in the
 * backend; capabilities merely describe and dispatch.
 */
export class CapabilityRegistry {
  // Stored loosely-typed because definitions have heterogeneous generics; the
  // typed surface is preserved through `register` and `invoke`.
  private readonly capabilities = new Map<
    string,
    CapabilityDefinition<unknown, unknown>
  >();

  /** Register a capability. Throws if the name is already taken. */
  register<TInput, TOutput>(definition: CapabilityDefinition<TInput, TOutput>): void {
    if (this.capabilities.has(definition.name)) {
      throw new Error(`Capability "${definition.name}" is already registered.`);
    }
    this.capabilities.set(
      definition.name,
      definition as CapabilityDefinition<unknown, unknown>,
    );
  }

  /** List all registered capabilities (metadata only). */
  list(): ReadonlyArray<CapabilityDefinition<unknown, unknown>> {
    return Array.from(this.capabilities.values());
  }

  /** Look up a capability definition by name. */
  get(name: string): CapabilityDefinition<unknown, unknown> | undefined {
    return this.capabilities.get(name);
  }

  /**
   * Invoke a capability by name. Applies, in order:
   *   1. input schema validation,
   *   2. explicit human confirmation (when the capability requires it),
   *   3. execution via the provided context/transport,
   *   4. output schema validation.
   */
  async invoke<TOutput = unknown>(
    name: string,
    input: unknown,
    ctx: CapabilityContext,
  ): Promise<TOutput> {
    const definition = this.capabilities.get(name);
    if (!definition) {
      throw new Error(`Unknown capability "${name}".`);
    }

    const parsedInput = definition.inputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new CapabilityValidationError(name, 'input', parsedInput.error.issues);
    }

    if (definition.permissions.requiresHumanConfirmation) {
      const approved = await ctx.confirm({
        capabilityName: name,
        summary: definition.description,
        details: parsedInput.data as Readonly<Record<string, unknown>>,
      });
      if (!approved) {
        throw new ConfirmationDeniedError(name);
      }
    }

    const result = await definition.execute(parsedInput.data, ctx);

    const parsedOutput = definition.outputSchema.safeParse(result);
    if (!parsedOutput.success) {
      throw new CapabilityValidationError(name, 'output', parsedOutput.error.issues);
    }

    return parsedOutput.data as TOutput;
  }
}

/**
 * Process-wide registry instance. Capabilities are registered here by later
 * specifications. The foundation intentionally ships it empty.
 */
export const capabilityRegistry = new CapabilityRegistry();
