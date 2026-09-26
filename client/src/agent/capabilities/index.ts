/**
 * Agent capability catalogue — public entry point (Spec 09).
 *
 * Exposes the capability definitions, their I/O schemas, and the registration
 * helpers. The WebMCP layer (Spec 11) and MCP server (Spec 12) consume this as
 * the single shared contract.
 */
export * from './schemas';
export {
  findCourses,
  getCourseDetails,
  compareCourses,
  prepareEnquiry,
  validateEnquiry,
  submitEnquiry,
  makeNavigateToCourse,
  createCapabilities,
  createMcpCapabilities,
  courseDetailsHref,
  type CapabilityCollaborators,
} from './definitions';
export {
  registerWebMcpCapabilities,
  registerMcpCapabilities,
  CAPABILITY_NAMES,
} from './register';
