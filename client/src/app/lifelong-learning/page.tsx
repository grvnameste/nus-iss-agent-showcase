import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { COMPARISON_HREF } from '@/components/comparison/routes';

export const metadata: Metadata = {
  title: 'Lifelong Learning — EduAgent Connect',
  description:
    'Continuing education and professional development. Browse the synthetic course catalogue and compare shortlisted courses. For demonstration only.',
};

/**
 * Lifelong Learning landing page. Surfaces the course journeys added by the
 * feature specs (FR-615, FR-625): the Course Catalogue (Spec 02) and the
 * Comparison view (Spec 04). The shared LL sub-navigation sits above this
 * content via the LL segment layout (TASK-605); this landing surfaces the same
 * journeys as prominent entry points for a first-time visitor.
 */
export default function LifelongLearningPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Lifelong Learning
        </h1>
        <p className="max-w-2xl text-slate-600">
          Continuing education and professional development for working adults.
          Explore short courses, part-time programmes, and micro-credentials
          across a range of disciplines.
        </p>
      </section>

      <section aria-labelledby="journeys-heading" className="space-y-4">
        <h2 id="journeys-heading" className="text-2xl font-semibold text-slate-900">
          Explore courses
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-slate-900">Course Catalogue</h3>
            <p className="mt-1 text-slate-600">
              Browse, search, filter, and sort the full catalogue of synthetic
              courses, then open any course to view its details.
            </p>
            <div className="mt-4">
              <Link href="/lifelong-learning/courses" className={buttonClasses()}>
                Browse the Course Catalogue
              </Link>
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-slate-900">Compare courses</h3>
            <p className="mt-1 text-slate-600">
              Shortlist courses from the catalogue or a course&apos;s details, then
              view them side by side to compare fees, duration, and delivery.
            </p>
            <div className="mt-4">
              <Link href={COMPARISON_HREF} className={buttonClasses('secondary')}>
                View course comparison
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
