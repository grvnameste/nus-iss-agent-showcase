import type { Metadata } from 'next';
import { EnquiryDashboard } from './EnquiryDashboard';

export const metadata: Metadata = {
  title: 'Dashboard — EduAgent Connect',
  description:
    'Review submitted enquiries in this demonstration dashboard. All enquiries and learner details shown are synthetic and for demonstration only.',
};

/**
 * Enquiry dashboard page (Spec 16, FR-1604) at /dashboard.
 *
 * Server component wrapper: the heading and synthetic-data intro are static.
 * The enquiry list is dynamic (fetched from `GET /api/enquiries`), so the
 * interactive review is delegated to a client component that manages its own
 * loading / empty / error lifecycle — mirroring how the catalogue reads data
 * client-side.
 */
export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
          Demonstration
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="max-w-2xl text-slate-600">
          Every enquiry submitted through this prototype appears here, newest first. All
          records are synthetic demonstration data — no real learner details are stored —
          so each enquiry is shown in full, without masking.
        </p>
      </header>

      <EnquiryDashboard />
    </div>
  );
}
