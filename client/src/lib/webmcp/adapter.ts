import type { CapabilityTransport } from './types';

/**
 * Browser transport adapter.
 *
 * Concrete, browser-specific implementation of {@link CapabilityTransport}
 * built on `fetch`. Keeping it behind the transport interface means the
 * capability layer never references `window`, `fetch`, or `document` directly
 * (rule 4). Swapping this for a server/test transport requires no capability
 * changes.
 *
 * This adapter performs transport only. It does not implement business rules —
 * the backend owns and independently validates those.
 */
export interface HttpTransportOptions {
  /** Base URL of the backend REST API, e.g. "http://localhost:4000". */
  readonly baseUrl: string;
}

export function createBrowserTransport(
  options: HttpTransportOptions,
): CapabilityTransport {
  const base = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(
    method: 'GET' | 'POST',
    path: string,
    init: { query?: Record<string, unknown>; body?: unknown },
  ): Promise<T> {
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
    if (init.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Backend request failed: ${method} ${path} -> ${response.status} ${text}`,
      );
    }

    return (await response.json()) as T;
  }

  return {
    read<T>(path: string, query?: Record<string, unknown>): Promise<T> {
      return request<T>('GET', path, query ? { query } : {});
    },
    write<T>(path: string, body: unknown): Promise<T> {
      return request<T>('POST', path, { body });
    },
  };
}

/**
 * Resolve the API base URL from the public runtime environment. Falls back to
 * the local backend port used by this prototype.
 */
export function resolveApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
}
