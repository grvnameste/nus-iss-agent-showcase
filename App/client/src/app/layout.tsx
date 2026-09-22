import type { Metadata } from 'next';
import './globals.css';
import { ComparisonAnnouncer } from '@/components/comparison/ComparisonAnnouncer';
import { ComparisonBar } from '@/components/comparison/ComparisonBar';
import { AppProviders } from '@/components/providers/AppProviders';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';
import { RouteFocus } from '@/components/layout/RouteFocus';

export const metadata: Metadata = {
  title: 'EduAgent Connect',
  description:
    'An original demonstration website exploring how an education platform can become Agent Ready. Synthetic data only; WebMCP is a future capability and is not implemented.',
};

/**
 * Root layout: the website shell (FR-008). Provides semantic landmarks
 * (header / main / footer), a keyboard skip link, and consistent structure that
 * wraps every route.
 *
 * Cross-feature client providers are mounted once via `AppProviders`
 * (Spec 06, AD-601, FR-623, FR-621): Spec 04's `ComparisonProvider` — so a
 * learner's shortlist survives navigation between the catalogue, a course's
 * details, and the comparison view — and the shell-level `NotificationProvider`
 * for accessible cross-feature feedback. The comparison live region and the
 * running "Compare (n)" affordance sit inside the providers for the same reason.
 *
 * `RouteFocus` (Spec 06, AD-609, NFR-605) manages focus on client-side route
 * changes so keyboard/screen-reader users are re-oriented to the new page's
 * main landmark rather than being stranded on a stale control.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-sky-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <AppProviders>
          <RouteFocus />
          <Header />
          <PageContainer>{children}</PageContainer>
          <ComparisonAnnouncer />
          <ComparisonBar />
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
