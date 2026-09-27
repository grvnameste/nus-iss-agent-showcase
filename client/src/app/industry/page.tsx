import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { SectionHero } from '@/components/marketing/SectionHero';
import { StatStrip } from '@/components/marketing/StatStrip';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';

export const metadata: Metadata = {
  title: 'Industry — EduAgent Connect',
  description:
    'Explore synthetic partnership models and workforce-collaboration ideas that connect industry with lifelong learning. A demonstration site with original, synthetic content and no real company names or claims.',
};

/**
 * Fictional partnership models (FR-703.2, FR-708). Entirely synthetic — there
 * are deliberately NO real company names, partner names, or partnership claims.
 */
const PARTNERSHIP_MODELS: readonly { title: string; blurb: string }[] = [
  {
    title: 'Work-Study Collaboration',
    blurb:
      'A demonstration model blending structured study with hands-on placements, so learners build capability while applying it in illustrative workplace settings.',
  },
  {
    title: 'Custom Skills Programmes',
    blurb:
      'A synthetic model shaping short, focused learning around the illustrative skill needs of a team, delivered flexibly around real-world schedules.',
  },
  {
    title: 'Capstone & Challenge Projects',
    blurb:
      'A fictional model connecting learners with applied, project-based challenges that mirror how skills are used to solve practical problems.',
  },
  {
    title: 'Talent & Capability Development',
    blurb:
      'An illustrative model supporting continuous growth, helping teams keep pace with evolving practice through ongoing, synthetic learning pathways.',
  },
];

/** Conceptual Discover → Design → Deliver → Review flow (FR-703.3). */
const COLLABORATION_JOURNEY: readonly {
  step: string;
  title: string;
  blurb: string;
}[] = [
  {
    step: 'Step 1',
    title: 'Discover',
    blurb:
      'Explore illustrative goals and identify where learning could support a team, entirely within this demonstration.',
  },
  {
    step: 'Step 2',
    title: 'Design',
    blurb:
      'Shape a conceptual programme around those goals, choosing synthetic formats and focus areas that fit.',
  },
  {
    step: 'Step 3',
    title: 'Deliver',
    blurb:
      'Run the illustrative programme, blending study with applied, hands-on activities where it helps.',
  },
  {
    step: 'Step 4',
    title: 'Review',
    blurb:
      'Reflect on illustrative outcomes and plan the next iteration of continued, synthetic learning.',
  },
];

/** Synthetic outcome figures — never presented as real data (FR-703.4, FR-708.2). */
const INDUSTRY_STATS: readonly { value: string; label: string }[] = [
  { value: '4', label: 'Illustrative partnership models' },
  { value: '4', label: 'Conceptual collaboration stages' },
  { value: '20+', label: 'Synthetic applied project ideas' },
  { value: '100%', label: 'Original, synthetic content' },
];

/** Conceptual partner-value benefits (FR-703.5). */
const PARTNER_VALUE: readonly { title: string; blurb: string }[] = [
  {
    title: 'Talent development',
    blurb:
      'Support illustrative pathways that help people grow into new roles and responsibilities.',
  },
  {
    title: 'Skills alignment',
    blurb:
      'Shape synthetic learning around the capabilities that matter most to a team.',
  },
  {
    title: 'Applied project opportunities',
    blurb:
      'Connect learners with hands-on, project-based challenges drawn from illustrative scenarios.',
  },
  {
    title: 'Continuous learning',
    blurb:
      'Encourage ongoing growth so capability keeps pace with evolving practice over time.',
  },
];

/**
 * Industry section page (design §8). Purely presentational: a server component
 * composing shared primitives — no state, no data fetching, no business logic,
 * and no new routes. All copy is original and synthetic, with no real company
 * names or partnership claims; any figures are labelled illustrative (FR-708).
 */
export default function IndustryPage(): React.JSX.Element {
  return (
    <div className="space-y-12">
      <section aria-labelledby="industry-hero-heading">
        <SectionHero
          eyebrow="Industry"
          headingId="industry-hero-heading"
          title="Partnerships that grow capability"
          intro="Explore synthetic ways industry and learning can collaborate — from work-study placements to applied projects and ongoing capability development. This is a demonstration experience with original, synthetic content and no real company names or claims."
        >
          <Link href="/lifelong-learning" className={buttonClasses()}>
            Explore lifelong learning
          </Link>
          <Link href={CATALOGUE_HREF} className={buttonClasses('secondary')}>
            Browse the course catalogue
          </Link>
        </SectionHero>
      </section>

      <section aria-labelledby="partnership-models-heading" className="space-y-4">
        <h2
          id="partnership-models-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Partnership models
        </h2>
        <p className="max-w-2xl text-slate-600">
          Four fictional models showing how collaboration could take shape. Every
          model is synthetic — there are no real partners or claims.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNERSHIP_MODELS.map((model) => (
            <Card as="article" key={model.title}>
              <h3 className="text-lg font-semibold text-slate-900">{model.title}</h3>
              <p className="mt-1 text-slate-600">{model.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="collaboration-journey-heading" className="space-y-4">
        <h2
          id="collaboration-journey-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Collaboration journey
        </h2>
        <p className="max-w-2xl text-slate-600">
          A conceptual flow from first discovery through to review and the next
          iteration.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLLABORATION_JOURNEY.map((stage) => (
            <Card as="article" key={stage.title}>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                {stage.step}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {stage.title}
              </h3>
              <p className="mt-1 text-slate-600">{stage.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="industry-outcomes-heading" className="space-y-4">
        <h2
          id="industry-outcomes-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Illustrative outcomes
        </h2>
        <StatStrip items={INDUSTRY_STATS} aria-labelledby="industry-outcomes-heading" />
      </section>

      <section aria-labelledby="partner-value-heading" className="space-y-4">
        <h2
          id="partner-value-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Partner value
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNER_VALUE.map((benefit) => (
            <Card as="article" key={benefit.title}>
              <h3 className="text-lg font-semibold text-slate-900">
                {benefit.title}
              </h3>
              <p className="mt-1 text-slate-600">{benefit.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="industry-cta-heading" className="space-y-4">
        <h2
          id="industry-cta-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Start a learning collaboration
        </h2>
        <p className="max-w-2xl text-slate-600">
          Curious how learning could support your team? Explore the Lifelong
          Learning area to see the pathways available.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/lifelong-learning" className={buttonClasses()}>
            Explore lifelong learning
          </Link>
        </div>
      </section>
    </div>
  );
}
