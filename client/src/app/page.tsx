import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { BackendHealth } from '@/components/BackendHealth';

export const metadata: Metadata = {
  title: 'Home — EduAgent Connect',
  description:
    'An original demonstration website exploring how an education platform can become Agent Ready. Synthetic data only.',
};

/**
 * Home page. Introduces the demonstration and shows a live backend health
 * indicator (FR-014) proving frontend↔backend connectivity through the transport
 * boundary. Business features are added by later specifications.
 */
export default function HomePage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Demonstration prototype
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          EduAgent Connect
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          An original demonstration website exploring how a traditional education platform
          can become Agent Ready. It uses synthetic data throughout. WebMCP is a future
          capability and is not implemented in this foundation.
        </p>
      </section>

      <section aria-labelledby="explore-heading" className="space-y-4">
        <h2 id="explore-heading" className="text-2xl font-semibold text-slate-900">
          Explore the platform
        </h2>
        <p className="max-w-2xl text-slate-600">
          Use the navigation to browse the top-level sections. These are foundation
          placeholders; later specifications add real capabilities — starting with the
          Course Catalogue under Lifelong Learning.
        </p>
      </section>

      <section aria-labelledby="health-heading" className="space-y-4">
        <h2 id="health-heading" className="text-2xl font-semibold text-slate-900">
          System status
        </h2>
        <Card className="max-w-md">
          <BackendHealth />
        </Card>
      </section>
    </div>
  );
}
