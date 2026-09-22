import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';

/**
 * Global 404 / not-found page (Spec 06, FR-627, AD-608).
 *
 * Next.js App Router renders this within the root layout shell (header / main /
 * footer, skip link), so it inherits the site's landmarks and visual style
 * automatically. It reuses the Spec 01 primitives (`Card`, `buttonClasses`) and
 * the canonical catalogue route constant (C2/C4) rather than restating styles or
 * hrefs, and offers a clear path back into the site.
 *
 * It carries no business logic and exposes no internals — an unknown route is a
 * plain, friendly dead-end with obvious next steps, consistent with the shared
 * not-found / error conventions documented in the UI consistency guide (§5).
 */
export const metadata: Metadata = {
  title: 'Page not found — EduAgent Connect',
  description: 'The page you were looking for could not be found.',
};

export default function NotFound(): React.JSX.Element {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
          Error 404
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          We couldn&apos;t find that page
        </h1>
        <p className="max-w-prose text-slate-600">
          The page you were looking for may have been moved or removed, or the
          address might be mistyped. Let&apos;s get you back on track.
        </p>
      </div>

      <Card className="max-w-xl">
        <p className="text-slate-600">
          Head back to the home page, or jump straight into the Course Catalogue
          to browse the courses on offer.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className={buttonClasses()}>
            Back to Home
          </Link>
          <Link href={CATALOGUE_HREF} className={buttonClasses('secondary')}>
            Browse the Course Catalogue
          </Link>
        </div>
      </Card>
    </section>
  );
}
