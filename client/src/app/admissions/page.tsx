import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { SectionHero } from '@/components/marketing/SectionHero';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';

export const metadata: Metadata = {
  title: 'Admissions — EduAgent Connect',
  description:
    'Follow a synthetic, step-by-step application journey — explore, compare, prepare, submit, and plan ahead. A demonstration site with original, synthetic content and illustrative dates only.',
};

/**
 * Conceptual "How to Apply" steps (FR-702.2). Rendered as a semantic ordered
 * list (FR-706.4). Descriptions are original and synthetic — there are NO real
 * admissions requirements here.
 */
const APPLICATION_STEPS: readonly { title: string; blurb: string }[] = [
  {
    title: 'Explore your options',
    blurb:
      'Browse illustrative learning pathways and shortlist the directions that match your interests and goals.',
  },
  {
    title: 'Compare pathways',
    blurb:
      'Weigh up shortlisted options side by side to see how each could fit your plans, using synthetic guidance only.',
  },
  {
    title: 'Prepare your application',
    blurb:
      'Gather the conceptual information you would like to share, at your own pace, with no real requirements to meet.',
  },
  {
    title: 'Review and submit',
    blurb:
      'Check your draft, confirm it reflects your intent, and submit an illustrative enquiry when you are ready.',
  },
  {
    title: 'Plan your next step',
    blurb:
      'Look ahead to how a chosen pathway could progress over time across foundational and more advanced offerings.',
  },
];

/**
 * Entry & planning concept cards (FR-702.3). Concepts only — deliberately no
 * real admissions criteria.
 */
const ENTRY_PLANNING: readonly { title: string; blurb: string }[] = [
  {
    title: 'Choosing a pathway',
    blurb:
      'Reflect on your interests and goals to pick an illustrative direction that feels right for you.',
  },
  {
    title: 'Understanding course expectations',
    blurb:
      'Get a synthetic sense of the time, effort, and focus a pathway might involve before you commit.',
  },
  {
    title: 'Preparing supporting information',
    blurb:
      'Consider the conceptual details you may want to share, kept entirely within this demonstration.',
  },
  {
    title: 'Planning around an intake',
    blurb:
      'Think ahead about how an illustrative intake window could shape your timeline.',
  },
];

/**
 * Clearly-illustrative key dates (FR-702.4). These are synthetic placeholders,
 * NOT real institutional dates. The section carries a visible illustrative
 * caption so they can never read as authoritative.
 */
const KEY_DATES: readonly { term: string; detail: string }[] = [
  { term: 'Illustrative intake A', detail: 'Applications open early in the year' },
  { term: 'Illustrative intake B', detail: 'Applications open mid-year' },
  { term: 'Illustrative review window', detail: 'A few weeks after each intake opens' },
  { term: 'Illustrative next steps', detail: 'Shortly after the review window closes' },
];

/** Applicant-oriented, synthetic guidance tips (FR-702.5). */
const HELPFUL_GUIDANCE: readonly { title: string; blurb: string }[] = [
  {
    title: 'Start early',
    blurb:
      'Give yourself time to explore and compare pathways before preparing a draft.',
  },
  {
    title: 'Keep it focused',
    blurb:
      'Shortlist a few options that genuinely interest you rather than trying to cover everything.',
  },
  {
    title: 'Ask questions',
    blurb:
      'Use the catalogue to learn more about each pathway before you submit an illustrative enquiry.',
  },
];

/**
 * Admissions section page (design §7). Purely presentational: a server
 * component composing shared primitives — no state, no data fetching, no
 * business logic, and no new routes. The application process is a semantic
 * `<ol>` (FR-706.4); all copy is original and synthetic, and dates are clearly
 * illustrative (FR-708). Admissions funnels to the catalogue, the natural entry
 * to the enquiry flow (design §3).
 */
export default function AdmissionsPage(): React.JSX.Element {
  return (
    <div className="space-y-12">
      <section aria-labelledby="admissions-hero-heading">
        <SectionHero
          eyebrow="Admissions"
          headingId="admissions-hero-heading"
          title="Your application journey, step by step"
          intro="Explore a synthetic, learner-friendly path from first discovery through to a confirmed enquiry. This is a demonstration experience with original, synthetic content and clearly illustrative dates."
        >
          <Link href={CATALOGUE_HREF} className={buttonClasses()}>
            Browse the course catalogue
          </Link>
          <Link href="/lifelong-learning" className={buttonClasses('secondary')}>
            Explore lifelong learning
          </Link>
        </SectionHero>
      </section>

      <section aria-labelledby="how-to-apply-heading" className="space-y-4">
        <h2
          id="how-to-apply-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          How to apply
        </h2>
        <p className="max-w-2xl text-slate-600">
          A conceptual, five-step journey. Every step is synthetic — there are no
          real admissions requirements.
        </p>
        <ol className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPLICATION_STEPS.map((step, index) => (
            <Card as="li" key={step.title}>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1 text-slate-600">{step.blurb}</p>
            </Card>
          ))}
        </ol>
      </section>

      <section aria-labelledby="entry-planning-heading" className="space-y-4">
        <h2
          id="entry-planning-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Entry &amp; planning
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRY_PLANNING.map((item) => (
            <Card as="article" key={item.title}>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-slate-600">{item.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="key-dates-heading" className="space-y-4">
        <h2
          id="key-dates-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Key dates
        </h2>
        <p className="max-w-2xl text-slate-600">
          An illustrative schedule to show how intake timing might work. These are
          synthetic placeholders, not real dates.
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          {KEY_DATES.map((entry) => (
            // Reuse the shared Card treatment (consistency with the other four
            // pages); a <div> grouping a dt/dd pair is valid inside a <dl>.
            <Card as="div" key={entry.term}>
              <dt className="text-lg font-semibold text-slate-900">{entry.term}</dt>
              <dd className="mt-1 text-slate-600">{entry.detail}</dd>
            </Card>
          ))}
        </dl>
        {/* Textual, not colour-only, so the synthetic nature is unmissable. */}
        <p className="text-sm text-slate-400">
          Illustrative synthetic data — not real admissions dates.
        </p>
      </section>

      <section aria-labelledby="helpful-guidance-heading" className="space-y-4">
        <h2
          id="helpful-guidance-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Helpful guidance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HELPFUL_GUIDANCE.map((tip) => (
            <Card as="article" key={tip.title}>
              <h3 className="text-lg font-semibold text-slate-900">{tip.title}</h3>
              <p className="mt-1 text-slate-600">{tip.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="admissions-cta-heading" className="space-y-4">
        <h2
          id="admissions-cta-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Ready to begin?
        </h2>
        <p className="max-w-2xl text-slate-600">
          Browse the course catalogue to explore pathways and start an illustrative
          enquiry, or take a wider look at the Lifelong Learning area.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={CATALOGUE_HREF} className={buttonClasses()}>
            Browse the course catalogue
          </Link>
          <Link href="/lifelong-learning" className={buttonClasses('secondary')}>
            Explore lifelong learning
          </Link>
        </div>
      </section>
    </div>
  );
}
