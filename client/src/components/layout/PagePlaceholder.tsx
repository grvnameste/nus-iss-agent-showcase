import type { ReactNode } from 'react';

/**
 * Reusable placeholder for the top-level section pages (FR-009). Establishes a
 * consistent heading + intro pattern for the foundation. Later specifications
 * replace these placeholders with real capability content (e.g. Lifelong
 * Learning gains the Course Catalogue in Specification 02).
 */
export function PagePlaceholder({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="max-w-2xl text-slate-600">{intro}</p>
      {children}
      <p className="text-sm text-slate-400">
        This section is a foundation placeholder. Functionality is added by later
        specifications.
      </p>
    </div>
  );
}
