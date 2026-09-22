import type { Metadata } from 'next';
import { ComparisonView } from '@/components/comparison/ComparisonView';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { comparisonBreadcrumbs } from '@/components/layout/course-breadcrumbs';

export const metadata: Metadata = {
  title: 'Compare courses — EduAgent Connect',
  description:
    'Compare shortlisted synthetic continuing-education courses side by side — type, delivery, duration, fee, intake, and availability. For demonstration only.',
};

/**
 * Course Comparison route (FR-409, AD-406) at
 * /lifelong-learning/courses/compare.
 *
 * A static `compare` segment sits beside the `[courseId]` details route; Next.js
 * matches the static segment first, so the two never collide.
 *
 * Server-component host: the heading and intro are static, and the interactive
 * comparison is a client component reading the shared comparison state mounted
 * in the app shell.
 */
export default function CourseComparisonPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={comparisonBreadcrumbs} />

      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Lifelong Learning
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Compare courses
        </h1>
        <p className="max-w-2xl text-slate-600">
          Review the courses you shortlisted side by side. Attributes are shown exactly as
          recorded for each course — nothing here is ranked, scored, or recommended. All
          courses and data shown are synthetic and for demonstration only.
        </p>
      </header>

      <ComparisonView />
    </div>
  );
}
