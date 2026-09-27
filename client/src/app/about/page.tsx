import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { SectionHero } from '@/components/marketing/SectionHero';

export const metadata: Metadata = {
  title: 'About — EduAgent Connect',
  description:
    'EduAgent Connect is an original, synthetic demonstration of a learner-focused education website. It is not an official Republic Polytechnic site and is not affiliated with or endorsed by Republic Polytechnic.',
};

/** Purpose & principles cards (FR-704.2) — original, synthetic copy. */
const PRINCIPLES: readonly { title: string; blurb: string }[] = [
  {
    title: 'Learner-first journeys',
    blurb:
      'Every section is organised around what a learner is trying to do — discover, compare, and take the next step — rather than around an internal structure.',
  },
  {
    title: 'Clear information architecture',
    blurb:
      'Content is grouped into consistent, predictable sections so people can find what they need without guesswork, on any screen size.',
  },
  {
    title: 'Honest, synthetic content',
    blurb:
      'All copy and figures are original and illustrative. Nothing here is real institutional data, and figures are always labelled as synthetic.',
  },
  {
    title: 'Accessible by default',
    blurb:
      'Semantic headings, labelled sections, and descriptive links are baked in, so the experience works with keyboards and assistive technology.',
  },
];

/**
 * Explore links to EXISTING routes only (FR-704.5, FR-705.6). No new routes are
 * created by this page; each target is an already-built destination.
 */
const EXPLORE_LINKS: readonly { href: string; label: string; blurb: string }[] = [
  {
    href: '/',
    label: 'Home',
    blurb: 'Start at the landing page for an overview of the demonstration.',
  },
  {
    href: '/education',
    label: 'Education',
    blurb: 'Browse synthetic programme areas and conceptual academic pathways.',
  },
  {
    href: '/admissions',
    label: 'Admissions',
    blurb: 'Walk through an illustrative, step-by-step application journey.',
  },
  {
    href: '/industry',
    label: 'Industry',
    blurb: 'See fictional partnership models and collaboration ideas.',
  },
  {
    href: '/lifelong-learning',
    label: 'Lifelong Learning',
    blurb: 'Explore the course catalogue, comparison, and enquiry journey.',
  },
];

/**
 * About section page (design §9). Purely presentational: a server component
 * composing shared primitives — no state, no data fetching, no business logic,
 * and no new routes.
 *
 * The "Agent Ready" section is CONCEPTUAL ONLY (FR-704.3): it is deliberately
 * forward-looking and must never describe or imply an implemented WebMCP API,
 * agent tools, autonomous agents, or tool calling. All content is original and
 * synthetic, and the page states RP non-affiliation explicitly (FR-704.4).
 */
export default function AboutPage(): React.JSX.Element {
  return (
    <div className="space-y-12">
      <section aria-labelledby="about-hero-heading">
        <SectionHero
          eyebrow="About"
          headingId="about-hero-heading"
          title="A demonstration of a learner-focused education website"
          intro="EduAgent Connect is an original, synthetic prototype that shows how a modern education website can be structured around clear learner journeys. It is a demonstration only — the content, figures, and organisations are entirely fictional."
        >
          <Link href="/lifelong-learning" className={buttonClasses()}>
            Explore the learning journey
          </Link>
        </SectionHero>
      </section>

      <section aria-labelledby="about-purpose-heading" className="space-y-4">
        <h2
          id="about-purpose-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Purpose &amp; principles
        </h2>
        <p className="max-w-2xl text-slate-600">
          The purpose of this site is to demonstrate a coherent, accessible, and
          professional learner experience end to end — from discovering options to
          preparing an enquiry — using only original, synthetic content. These
          principles guide how every section is built.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle) => (
            <Card as="article" key={principle.title}>
              <h3 className="text-lg font-semibold text-slate-900">
                {principle.title}
              </h3>
              <p className="mt-1 text-slate-600">{principle.blurb}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-agent-ready-heading" className="space-y-4">
        <h2
          id="about-agent-ready-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Designed with agent-ready thinking in mind
        </h2>
        {/*
          CONCEPTUAL ONLY (FR-704.3). This is a forward-looking note about how a
          clear information architecture COULD support future agent-assisted
          experiences. It intentionally makes NO claim of any implemented agent
          capability — no WebMCP API, no agent tools, no autonomous agents, and no
          tool calling exist here. Keep this wording forward-looking.
        */}
        <p className="max-w-2xl text-slate-600">
          Beyond serving people directly, this demonstration is organised so that
          the same clear structure could, in principle, make information easier to
          navigate for future agent-assisted experiences. That is a conceptual,
          forward-looking idea only.
        </p>
        <p className="max-w-2xl text-slate-600">
          To be clear, this prototype does not include any implemented agent
          functionality: there is no autonomous agent, no tool calling, and no
          agent-facing capability layer wired into the pages you see. The
          &ldquo;agent-ready&rdquo; framing simply describes an intent to keep the
          experience well-structured, predictable, and easy to reason about — for
          people today and, potentially, for agent-assisted journeys in the future.
        </p>
      </section>

      <section aria-labelledby="about-synthetic-heading" className="space-y-4">
        <h2
          id="about-synthetic-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Synthetic data &amp; non-affiliation
        </h2>
        <Card as="article" className="space-y-3">
          <p className="text-slate-600">
            All content on this site is original and synthetic. Any statistics and
            dates are illustrative and are not real institutional data. All
            organisations, partners, and testimonials are fictional. This is a
            demonstration prototype built to showcase structure and experience.
          </p>
          <p className="font-medium text-slate-700">
            This is not an official Republic Polytechnic website. EduAgent Connect
            is not affiliated with, operated by, or endorsed by Republic
            Polytechnic. Republic Polytechnic is referenced only as general
            inspiration for information architecture; no real names, branding, or
            figures are used.
          </p>
        </Card>
      </section>

      <section aria-labelledby="about-explore-heading" className="space-y-4">
        <h2
          id="about-explore-heading"
          className="text-2xl font-semibold text-slate-900"
        >
          Explore the site
        </h2>
        <p className="max-w-2xl text-slate-600">
          Continue the walkthrough from any of these existing sections.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE_LINKS.map((link) => (
            <Card as="li" key={link.href}>
              <h3 className="text-lg font-semibold text-slate-900">
                <Link
                  href={link.href}
                  className="text-sky-700 underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {link.label}
                </Link>
              </h3>
              <p className="mt-1 text-slate-600">{link.blurb}</p>
            </Card>
          ))}
        </ul>
      </section>
    </div>
  );
}
