'use client';

import { useEffect, useState } from 'react';
import { createBrowserTransport, resolveApiBaseUrl } from '@/lib/webmcp';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

type HealthState =
  | { phase: 'loading' }
  | { phase: 'ok'; data: HealthResponse }
  | { phase: 'error'; message: string };

/**
 * Backend health indicator (FR-014, TASK-016).
 *
 * Reads the API base URL from the public environment and calls `GET /api/health`
 * through the transport boundary (no browser-specific API used directly here, no
 * secrets in the client). Demonstrates frontend↔backend connectivity. State is a
 * discriminated union per coding-standards; status is announced via aria-live.
 */
export function BackendHealth(): React.JSX.Element {
  const [health, setHealth] = useState<HealthState>({ phase: 'loading' });

  useEffect(() => {
    const transport = createBrowserTransport({ baseUrl: resolveApiBaseUrl() });
    let active = true;

    transport
      .read<HealthResponse>('/api/health')
      .then((data) => {
        if (active) setHealth({ phase: 'ok', data });
      })
      .catch((err: unknown) => {
        if (active) {
          setHealth({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div aria-live="polite">
      <h3 className="mb-3 text-base font-semibold text-slate-800">Backend health</h3>
      {health.phase === 'loading' && <p className="text-slate-500">Checking API…</p>}
      {health.phase === 'error' && (
        <p className="text-red-700">
          Could not reach the API. Ensure the server is running. ({health.message})
        </p>
      )}
      {health.phase === 'ok' && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Status</dt>
          <dd className="font-medium text-emerald-700">{health.data.status}</dd>
          <dt className="text-slate-500">Service</dt>
          <dd className="text-slate-800">{health.data.service}</dd>
          <dt className="text-slate-500">Version</dt>
          <dd className="text-slate-800">{health.data.version}</dd>
          <dt className="text-slate-500">Uptime (s)</dt>
          <dd className="text-slate-800">{health.data.uptimeSeconds}</dd>
        </dl>
      )}
    </div>
  );
}
