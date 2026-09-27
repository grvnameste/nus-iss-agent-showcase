import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { startHttpHost, type HttpHostHandle } from './http-host.js';
import { MCP_TOOL_NAMES } from '../tools/register-tools.js';

/**
 * Spec 17 HTTP transport integration tests.
 *
 * Boots the real Streamable HTTP host on an ephemeral 127.0.0.1 port (no
 * network egress, no DNS-rebinding allow-lists → protection disabled for the
 * loopback test) and drives it with the SDK client over HTTP. Proves:
 * - `initialize` + `tools/list` advertises exactly the seven MCP tools;
 * - a READ (`find_courses`) returns data over the wire;
 * - `submit_enquiry` stays fail-closed (refused) over HTTP, matching stdio;
 * - `GET /healthz` returns `{ ok: true }`.
 *
 * The host reuses `buildServer()` with its default denying approver, so no real
 * write can occur regardless of transport.
 */

const goodEnquiry = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  courseId: 'c1',
  enquiryType: 'general',
  message: 'I would like to know more about this course please.',
};

let host: HttpHostHandle;
let client: Client;
let baseUrl: string;

beforeEach(async () => {
  // Port 0 → OS assigns a free ephemeral port; loopback only.
  host = await startHttpHost({
    host: '127.0.0.1',
    port: 0,
    // No allow-lists → DNS-rebinding protection disabled (safe for loopback test).
  });
  baseUrl = `http://127.0.0.1:${host.port}/mcp`;

  client = new Client({ name: 'test-client', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
  // Same known SDK/`exactOptionalPropertyTypes` quirk as the server transport:
  // the client transport's optional members are typed as always-present unions.
  await client.connect(transport as unknown as Transport);
});

afterEach(async () => {
  await client.close();
  await host.close();
});

describe('MCP over Streamable HTTP', () => {
  it('advertises exactly the seven MCP tools after initialize', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...MCP_TOOL_NAMES].sort());
    expect(names).toHaveLength(7);
    expect(names).not.toContain('navigate_to_course');
  });

  it('serves a READ (find_courses) over the wire', async () => {
    const result = await client.callTool({
      name: 'find_courses',
      arguments: { keyword: 'data' },
    });
    expect(result.isError).not.toBe(true);
    // Structured content carries the tool payload; content has a text block too.
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('keeps submit_enquiry fail-closed over HTTP (write refused)', async () => {
    const result = await client.callTool({
      name: 'submit_enquiry',
      arguments: goodEnquiry,
    });
    // The adapter refuses without an approver; the tool reports an error result
    // rather than performing the write.
    expect(result.isError).toBe(true);
  });
});

describe('health endpoint', () => {
  it('GET /healthz returns { ok: true }', async () => {
    const res = await fetch(`http://127.0.0.1:${host.port}/healthz`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
