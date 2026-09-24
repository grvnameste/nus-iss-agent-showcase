/**
 * WebMCP capability layer — public entry point.
 *
 * Re-exports the typed capability contract, the registry, and the browser
 * transport adapter. Feature specifications register their capabilities against
 * `capabilityRegistry`. This foundation ships the layer with no domain
 * capabilities registered yet.
 */
export * from './types';
export { CapabilityRegistry, capabilityRegistry } from './registry';
export {
  createBrowserTransport,
  resolveApiBaseUrl,
  type HttpTransportOptions,
} from './adapter';
