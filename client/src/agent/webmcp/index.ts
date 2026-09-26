/**
 * WebMCP integration layer — public entry point (Spec 11).
 *
 * Detection, the registry↔browser adapter, the invocation status store, the
 * human-confirmation controller/dialog, and the mountable `AgentProvider`.
 */
export {
  detectWebMcp,
  isWebMcpAvailable,
  type WebMcpSurface,
  type WebMcpToolDescriptor,
} from './detect';
export { StatusStore, type InvocationEntry, type InvocationStatus } from './status-store';
export { initWebMcp, type WebMcpInit, type WebMcpHandle } from './webmcp-adapter';
export {
  ConfirmationController,
  type PendingConfirmation,
} from './confirm/confirmation-controller';
export { ConfirmationDialog } from './confirm/ConfirmationDialog';
export { AgentProvider } from './AgentProvider';
