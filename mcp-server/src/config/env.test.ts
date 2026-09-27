import { describe, expect, it } from 'vitest';
import { env, parseList } from './env.js';

/**
 * Spec 17 config tests. The transport defaults to stdio (additive change: the
 * network transport is opt-in) and `parseList` splits allow-list env values into
 * a trimmed, non-empty array for DNS-rebinding protection.
 */
describe('env', () => {
  it('defaults MCP_TRANSPORT to stdio', () => {
    // Tests run without MCP_TRANSPORT set, so the safe default applies.
    expect(env.MCP_TRANSPORT).toBe('stdio');
  });
});

describe('parseList', () => {
  it('returns an empty array for an empty value', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList('   ')).toEqual([]);
  });

  it('splits, trims, and drops empties', () => {
    expect(parseList('a.example.com, b.example.com ,, ')).toEqual([
      'a.example.com',
      'b.example.com',
    ]);
  });
});
