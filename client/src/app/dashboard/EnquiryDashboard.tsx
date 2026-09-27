'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { enquiriesApi, EnquiryApiError } from '@/lib/enquiries/api';
import { ENQUIRY_TYPE_LABELS, type StoredEnquiry } from '@/lib/enquiries/types';

/**
 * Enquiry dashboard client component (Spec 16, FR-1604).
 *
 * Read-only review of stored enquiries. Fetches the list on mount and models
 * the async lifecycle as a discriminated union (loading | success | error) —
 * the same pattern the catalogue uses — so each state renders exactly one way.
 * It holds no business logic: ordering/shaping is the backend's job; this only
 * presents what `enquiriesApi.list()` returns.
 *
 * No masking is applied to the personal fields. That is intentional and safe:
 * the data is synthetic demonstration data (product/security steering), so the
 * dashboard shows every field to make the demo legible. This must never render
 * real learner PII.
 */

type RequestState =
  | { phase: 'loading' }
  | { phase: 'success'; enquiries: StoredEnquiry[] }
  | { phase: 'error'; message: string };

/** Format an ISO timestamp for display; fall back to the raw value if invalid. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EnquiryDashboard(): React.JSX.Element {
  const [request, setRequest] = useState<RequestState>({ phase: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setRequest({ phase: 'loading' });

    enquiriesApi
      .list(controller.signal)
      .then((enquiries) => {
        if (seq === requestSeq.current) {
          setRequest({ phase: 'success', enquiries });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || seq !== requestSeq.current) return;
        const message =
          error instanceof EnquiryApiError
            ? error.message
            : 'Something went wrong. Please try again.';
        setRequest({ phase: 'error', message });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  return (
    <section aria-labelledby="dashboard-enquiries" className="space-y-4">
      <h2
        id="dashboard-enquiries"
        className="text-2xl font-semibold text-slate-900"
      >
        Submitted enquiries
      </h2>

      {/* Announce async transitions to assistive technology without stealing focus. */}
      <div aria-live="polite" className="space-y-4">
        {request.phase === 'loading' && (
          <Card aria-busy="true">
            <p className="text-sm text-slate-600">Loading enquiries…</p>
          </Card>
        )}

        {request.phase === 'error' && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-8 text-center"
          >
            <h3 className="text-lg font-semibold text-red-900">
              We couldn&apos;t load the enquiries
            </h3>
            <p className="mt-1 text-sm text-red-800">{request.message}</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {request.phase === 'success' &&
          (request.enquiries.length === 0 ? (
            <Card className="text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                No enquiries yet
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Submitted enquiries will appear here once a learner sends one.
              </p>
            </Card>
          ) : (
            <EnquiryTable enquiries={request.enquiries} />
          ))}
      </div>
    </section>
  );
}

/** Accessible, labelled table of every stored enquiry field (no masking). */
function EnquiryTable({
  enquiries,
}: {
  enquiries: StoredEnquiry[];
}): React.JSX.Element {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full border-collapse text-left text-sm text-slate-700">
        <caption className="px-6 pt-6 text-left text-sm text-slate-500">
          {enquiries.length} synthetic enquir{enquiries.length === 1 ? 'y' : 'ies'},
          newest first. All fields are shown in full for this demonstration.
        </caption>
        <thead>
          <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-6 py-3">
              Reference
            </th>
            <th scope="col" className="px-6 py-3">
              Course
            </th>
            <th scope="col" className="px-6 py-3">
              Name
            </th>
            <th scope="col" className="px-6 py-3">
              Email
            </th>
            <th scope="col" className="px-6 py-3">
              Phone
            </th>
            <th scope="col" className="px-6 py-3">
              Type
            </th>
            <th scope="col" className="px-6 py-3">
              Status
            </th>
            <th scope="col" className="px-6 py-3">
              Submitted
            </th>
            <th scope="col" className="px-6 py-3">
              Message
            </th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((enquiry) => (
            <tr
              key={enquiry.reference}
              className="border-b border-slate-100 align-top last:border-b-0"
            >
              <th
                scope="row"
                className="px-6 py-4 font-mono text-xs font-semibold text-slate-900"
              >
                {enquiry.reference}
              </th>
              <td className="px-6 py-4">{enquiry.courseTitle}</td>
              <td className="px-6 py-4">{enquiry.name}</td>
              <td className="px-6 py-4">
                <a
                  href={`mailto:${enquiry.email}`}
                  className="rounded-sm text-sky-800 underline underline-offset-2 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {enquiry.email}
                </a>
              </td>
              <td className="px-6 py-4">
                {enquiry.phone ? (
                  enquiry.phone
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-6 py-4">{ENQUIRY_TYPE_LABELS[enquiry.enquiryType]}</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900">
                  {enquiry.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                {formatDate(enquiry.createdAt)}
              </td>
              <td className="max-w-md px-6 py-4 text-slate-600">{enquiry.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
