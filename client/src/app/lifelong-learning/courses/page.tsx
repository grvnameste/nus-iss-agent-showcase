import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CourseCatalogue } from '@/components/courses/CourseCatalogue';
import { CatalogueLoading } from '@/components/courses/CatalogueStates';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { catalogueBreadcrumbs } from '@/components/layout/course-breadcrumbs';

export const metadata: Metadata = {
  title: 'Course Catalogue — EduAgent Connect',
  description:
    'Browse, search, filter, and compare synthetic continuing-education courses. All data is fictional; for demonstration only.',
};

/**
 * Course Catalogue page (FR-212, AD-208) at /lifelong-learning/courses.
 *
 * Server component wrapper: heading and intro are static; the interactive
 * catalogue is a client component. Wrapped in Suspense because the catalogue
 * reads the URL search params.
 */
export default function CoursesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={catalogueBreadcrumbs} />

      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Lifelong Learning
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Course Catalogue
        </h1>
        <p className="max-w-2xl text-slate-600">
          Discover continuing-education and professional-development courses for working
          adults. Search by keyword, filter by discipline, delivery mode and more, then
          open a course to see its details. All courses and data shown here are synthetic
          and for demonstration only.
        </p>
      </header>

      <Suspense fallback={<CatalogueLoading />}>
        <CourseCatalogue />
      </Suspense>
    </div>
  );
}
