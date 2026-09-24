import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Navigation } from './Navigation';

/**
 * Site header (FR-008): brand + primary navigation, in a semantic <header>
 * landmark. Includes a skip link target relationship via the <main> element in
 * the layout for keyboard users.
 */
export function Header(): React.JSX.Element {
  return (
    <header className="border-b border-slate-200 bg-white">
      <Container className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-md bg-sky-700 text-sm font-bold text-white"
          >
            EA
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            EduAgent Connect
          </span>
        </Link>
        <Navigation />
      </Container>
    </header>
  );
}
