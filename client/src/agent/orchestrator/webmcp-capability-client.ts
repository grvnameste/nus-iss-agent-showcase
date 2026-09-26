/**
 * WebMCP-backed capability client (Spec 13 §3).
 *
 * Adapts the Spec 11 `WebMcpHandle` to the transport-agnostic
 * {@link CapabilityClient} the orchestrator consumes. `invoke` already flows
 * through the guardrailed registry pipeline (validate → confirm → execute →
 * validate) inside the handle, so this adapter adds no logic — it only exposes
 * the metadata list and forwards calls.
 */
import type { WebMcpHandle } from '@/agent/webmcp';
import type { CapabilityClient, CapabilityInfo } from './capability-client';

export function createWebMcpCapabilityClient(handle: WebMcpHandle): CapabilityClient {
  return {
    list(): readonly CapabilityInfo[] {
      return handle.registry.list().map((c) => ({
        name: c.name,
        description: c.description,
        kind: c.permissions.kind,
      }));
    },
    invoke(name: string, input: unknown): Promise<unknown> {
      return handle.invoke(name, input);
    },
  };
}
