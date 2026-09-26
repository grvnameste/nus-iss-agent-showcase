import { describe, expect, it } from 'vitest';
import { registerTools, MCP_TOOL_NAMES } from './register-tools.js';
import type { CapabilityAdapter } from '../adapters/capability-adapter.js';

/**
 * Confirms the MCP server advertises exactly the six MCP-applicable tools and
 * NOT the browser-only `navigate_to_course` (Spec 09 D2 / Spec 12 FR-1201).
 */
describe('registerTools', () => {
  it('registers the six MCP tools and excludes navigation', () => {
    const registered: string[] = [];
    // Minimal fake McpServer capturing registerTool names.
    const fakeServer = {
      registerTool: (name: string) => {
        registered.push(name);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // Adapter is not invoked by registration; a stub satisfies the type.
    const stubAdapter = {} as CapabilityAdapter;

    registerTools(fakeServer, stubAdapter);

    expect(registered.sort()).toEqual([...MCP_TOOL_NAMES].sort());
    expect(registered).not.toContain('navigate_to_course');
    expect(registered).toHaveLength(6);
  });
});
