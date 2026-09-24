import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { COMPARISON_HREF } from '@/components/comparison/routes';

/**
 * Site footer (FR-008, FR-616): secondary navigation and the synthetic-data /
 * demonstration notice, in a semantic <footer> landmark.
 *
 * The footer renders consistently on every page via the root layout. It groups
 * useful secondary links in a labelled <nav> ("Footer") using client-side
 * `next/link` navigation, and retains the synthetic-data/demo notice and the
 * copyright line. Where a canonical route constant exists (comparison,
 * catalogue), it is imported rather than hard-coded so the footer follows any
 * future route change made by the owning specs.
 */
interface FooterLink {
  readonly label: string;
  readonly href: string;
}

const FOOTER_LINKS: readonly FooterLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Lifelong Learning', href: '/lifelong-learning' },
  { label: 'Course Catalogue', href: CATALOGUE_HREF },
  { label: 'Compare Courses', href: COMPARISON_HREF },
  { label: 'About', href: '/about' },
];

export function Footer(): React.JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <Container className="flex flex-col gap-4 py-6 text-sm text-slate-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-medium text-slate-700">EduAgent Connect</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-1 gap-y-1">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p>
          An original demonstration website exploring how an education platform can become
          Agent Ready. All content and data are synthetic. This is not affiliated with,
          and does not integrate with, any real institution.
        </p>
        <p>© {year} EduAgent Connect — demonstration prototype.</p>
      </Container>
    </footer>
  );
}
