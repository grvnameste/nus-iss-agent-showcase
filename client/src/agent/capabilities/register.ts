/**
 * Capability registration (Spec 09).
 *
 * Registers the agent capability catalogue against a `CapabilityRegistry`. This
 * is the shared catalogue that both the WebMCP layer (Spec 11) and — via the
 * MCP-applicable subset — the MCP server (Spec 12) build on. Registration adds no
 * business logic; it only wires the typed definitions into the registry.
 */
import { CapabilityRegistry } from '@/lib/webmcp';
import {
  createCapabilities,
  createMcpCapabilities,
  type CapabilityCollaborators,
} from './definitions';

/**
 * Register the full (WebMCP) capability set, including browser-only
 * `navigate_to_course`, which needs the injected navigation collaborator.
 *
 * Returns the registry for convenient chaining/testing. Idempotency is the
 * registry's concern (it throws on duplicate names), so callers register once.
 */
export function registerWebMcpCapabilities(
  registry: CapabilityRegistry,
  collaborators: CapabilityCollaborators,
): CapabilityRegistry {
  for (const capability of createCapabilities(collaborators)) {
    registry.register(capability);
  }
  return registry;
}

/**
 * Register the MCP-applicable subset (Spec 09 D2): excludes the browser-only
 * `navigate_to_course`. Used by the MCP server (Spec 12).
 */
export function registerMcpCapabilities(
  registry: CapabilityRegistry,
): CapabilityRegistry {
  for (const capability of createMcpCapabilities()) {
    registry.register(capability);
  }
  return registry;
}

/** Stable capability names, so callers/tests avoid string drift. */
export const CAPABILITY_NAMES = {
  findCourses: 'find_courses',
  getCourseDetails: 'get_course_details',
  compareCourses: 'compare_courses',
  navigateToCourse: 'navigate_to_course',
  prepareEnquiry: 'prepare_enquiry',
  validateEnquiry: 'validate_enquiry',
  submitEnquiry: 'submit_enquiry',
} as const;
