import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import type { EnquiryConfirmationResult } from '@/lib/enquiries/types';
import { SyntheticDataNotice } from './SyntheticDataNotice';

/**
 * Confirmation state (FR-515, FR-516, FR-519).
 *
 * Shown in place of the form, which is what makes a confirmed enquiry
 * unresubmittable — there is no submit control left to press (FR-518). It
 * repeats the synthetic-data notice, because the moment a learner has "sent"
 * something is exactly when the demonstration disclaimer matters most.
 */

const STATUS_LABELS: Record<EnquiryConfirmationResult['status'], string> = {
  received: 'Received',
};

function formatSubmittedAt(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  return parsed.toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function EnquiryConfirmation({
  result,
  courseHref,
}: {
  result: EnquiryConfirmationResult;
  /** Link back to the course this enquiry was about. */
  courseHref: string;
}): React.JSX.Element {
  return (
    <section
      aria-labelledby="enquiry-confirmation-heading"
      className="space-y-6"
    >
      <Card className="space-y-6 border-emerald-200 bg-emerald-50/60">
        <div className="space-y-2">
          <h1
            id="enquiry-confirmation-heading"
            className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl"
          >
            Enquiry received
          </h1>
          <p className="max-w-prose text-emerald-900">
            Thanks — your enquiry has been recorded. Keep the reference below if you want
            to refer to it later.
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-emerald-900">Reference number</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-emerald-950">
              {result.reference}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-emerald-900">Status</dt>
            <dd className="mt-1 text-lg font-semibold text-emerald-950">
              {STATUS_LABELS[result.status]}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-emerald-900">Course</dt>
            <dd className="mt-1 font-semibold text-emerald-950">{result.courseTitle}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-emerald-900">Submitted</dt>
            <dd className="mt-1 text-emerald-950">{formatSubmittedAt(result.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">What happens next</h2>
        <ol className="list-decimal space-y-2 pl-5 text-slate-700">
          <li>
            Your enquiry is recorded against{' '}
            <span className="font-medium text-slate-900">{result.courseTitle}</span> with the
            reference above.
          </li>
          <li>
            In a real deployment, an admissions adviser would follow up by email within a
            few working days.
          </li>
          <li>
            In this demonstration nothing is sent onward — the record lives only in the
            running server&apos;s memory.
          </li>
        </ol>
      </div>

      <SyntheticDataNotice />

      <div className="flex flex-wrap gap-3">
        <Link
          href={courseHref}
          className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Back to course details
        </Link>
        <Link
          href={CATALOGUE_HREF}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Browse more courses
        </Link>
      </div>
    </section>
  );
}
