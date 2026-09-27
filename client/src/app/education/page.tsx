import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { SectionHero } from '@/components/marketing/SectionHero';
import { StatStrip } from '@/components/marketing/StatStrip';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';

export const metadata: Metadata = {
  title: 'Education — EduAgent Connect',
  description:
    'Explore synthetic full-time and diploma-style learning pathways across illustrative programme areas. A demonstration site with original, synthetic content only.',
};

/** Fictional, clearly-illustrative programme areas (FR-701.2, FR-708). */
const PROGRAMME_AREAS: readonly { title: string; blurb: string }[] = [
  {
    title: 'Computing & Digital',
    blurb:
      'A demonstration pathway spanning software craft, data foundations, and applied cloud practice for learners building digital fluency.',
  },
  {
    title: 'Business & Enterprise',
    blurb:
      'A synthetic track exploring enterprise operations, service design, and the analytical thinking behind everyday business decisions.',
  },
  {
    title: 'Design & Media',
    blurb:
      'An illustrative area covering visual storytelling, interaction design, and studio-style collaboration across digital media.',
  },
  {
    title: 'Engineering & Applied Technology',
    blurb:
      'A fictional pathway connecting core engineering principles with hands-on, project-led applied technology practice.',
  },
];

/** Conceptual Discover → Apply → Progress journey (FR-701.3). */
const ACADEMIC_PATHWAYS: readonly { step: string; title: string; blurb: string }[] = [
  {
    step: 'Step 1',
    title: 'Discover',
    blurb:
      'Browse illustrative programme areas and shortlist the directions that match your interests and goals.',
  },
  {
    step: 'Step 2',
    title: 'Apply',
    blurb:
      'Prepare a conceptual application and explore how a chosen pathway fits your plans, entirely with synthetic guidance.',
  },
  {
    step: 'Step 3',
    title: 'Progress',
    blurb:
      'Continue building skills over time, moving between foundational and more advanced illustrative offerings.',
  },
];

/** Learning-experience highlights (FR-701.4). */
const LEARNING_EXPERIENCE: readonly { title: string; blurb: string }[] = [
  {
    title: 'Project-based learning',
    blurb:
      'Apply ideas through hands-on projects that mirror how skills are used in practice.',
  },
  {
    title: 'Collaborative challenges',
    blurb:
      'Work alongside peers on shared, team-oriented problem solving.',
  },
  {
    title: 'Industry-informed activities',
    blurb:
      'Explore activities shaped by realistic, illustrative workplace scenarios.',
  },
  {
    title: 'Flexible skill development',
    blurb:
      'Build capability at your own pace across a range of illustrative formats.',
  },
];

/** Synthetic figures — never presented as real institutional data (FR-708.2). */
const EDUCATION_STATS: readonly { value: string; label: string }[] = [
  { value: '4', label: 'Illustrative programme areas' },
  { value: '3', label: 'Conceptual pathway stages' },
  { value: '12+', label: 'Synthetic learning formats' },
  { value: '100%', label: 'Original, synthetic content' },
];

/**
 * Education section page (design §6). Purely presentational: a server
 * component that composes shared primitives — no state, no data fetching, no
 * business logic, and no new routes. All copy is original and synthetic; any
 * figures are labelled illustrative (FR-708).
 */
export default function EducationPage(): React.JSX.Element {
  return (
    <div className="space-y-12">
      <section aria-labelledby="education-hero-heading">
        <SectionHero
          eyebrow="Education"
          headingId="education-hero-heading"
          title="Learning pathways for every stage"
          intro="Discover synthetic full-time and diploma-style learning pathways designed to help you explore interests, build capability, and progress with confidence. This is a demonstration experience with original, synthetic content."
        >
          <Link href="/lifelong-learning" className={buttonClasses()}>
            Explore lifelong learning
          </Link>
          <Link href={CATALOGUE_HREF} className={buttonClasses('secondary')}>
            Browse the course catalogue
          </Link>
        </SectionHero>
      </section>

      <section aria-labelledby="programme-areas-heading" className="space-y-4">
        <h2
          id="programme-areas-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Programme areas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMME_AREAS.map((area) => (
            <Card as="article" key={area.title}>
              <h3 className="text-lg font-semibold text-slate-900">{area.title}</h3>
              <p className="mt-1 text-slate-600">{area.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="academic-pathways-heading" className="space-y-4">
        <h2
          id="academic-pathways-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Academic pathways
        </h2>
        <p className="max-w-2xl text-slate-600">
          A conceptual journey from first discovery through to continued progress.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACADEMIC_PATHWAYS.map((stage) => (
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

      <section aria-labelledby="learning-experience-heading" className="space-y-4">
        <h2
          id="learning-experience-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Learning experience
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEARNING_EXPERIENCE.map((highlight) => (
            <Card as="article" key={highlight.title}>
              <h3 className="text-lg font-semibold text-slate-900">
                {highlight.title}
              </h3>
              <p className="mt-1 text-slate-600">{highlight.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="education-stats-heading" className="space-y-4">
        <h2
          id="education-stats-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Illustrative statistics
        </h2>
        <StatStrip items={EDUCATION_STATS} aria-labelledby="education-stats-heading" />
      </section>

      <section aria-labelledby="education-cta-heading" className="space-y-4">
        <h2
          id="education-cta-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Continue your learning journey
        </h2>
        <p className="max-w-2xl text-slate-600">
          Ready to go further? Explore continuing education and professional
          development in the Lifelong Learning area.
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
