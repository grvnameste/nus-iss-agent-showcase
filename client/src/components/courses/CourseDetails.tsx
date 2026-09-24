'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { coursesApi, CourseApiError } from '@/lib/courses/api';
import type { Course } from '@/lib/courses/types';
import { CourseDetailHeader } from './details/CourseDetailHeader';
import { CourseOverview } from './details/CourseOverview';
import { CourseKeyFacts } from './details/CourseKeyFacts';
import { CourseRequirements } from './details/CourseRequirements';
import { CourseSkills } from './details/CourseSkills';
import { CourseTags } from './details/CourseTags';
import { CourseActions } from './details/CourseActions';
import {
  CourseDetailsError,
  CourseDetailsLoading,
  CourseDetailsNotFound,
} from './details/DetailStates';
import type { CourseComparisonSeam } from './details/comparison-seam';
import { CATALOGUE_HREF } from './details/routes';

/**
 * Course Details page body (Specification 03).
 *
 * Presentation only: it retrieves one course through the existing Spec 02 API
 * client (`GET /api/courses/:courseId`) and renders it. No course business logic
 * lives here — the backend Course Service remains the single source of truth
 * (FR-302, NFR-301), including the listability rule behind the 404 (FR-311).
 *
 * Request state uses the discriminated-union pattern shared with the catalogue,
 * with an `AbortController` for cleanup and a reload token for retry.
 */

type DetailState =
  | { phase: 'loading' }
  | { phase: 'found'; course: Course }
  | { phase: 'notFound' }
  | { phase: 'error'; message: string };

export function CourseDetails({
  courseId,
  comparison,
}: {
  courseId: string;
  /** Optional Spec 04 comparison interface supplied by the route host. */
  comparison?: CourseComparisonSeam;
}): React.JSX.Element {
  const [state, setState] = useState<DetailState>({ phase: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  // Guards against a slow earlier response overwriting a newer one.
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setState({ phase: 'loading' });

    coursesApi
      .getById(courseId, controller.signal)
      .then((course) => {
        if (seq === requestSeq.current) setState({ phase: 'found', course });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || seq !== requestSeq.current) return;
        if (error instanceof CourseApiError && error.status === 404) {
          setState({ phase: 'notFound' });
          return;
        }
        setState({
          phase: 'error',
          message:
            error instanceof CourseApiError
              ? error.message
              : 'Something went wrong. Please try again.',
        });
      });

    return () => controller.abort();
  }, [courseId, reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  if (state.phase === 'loading') return <CourseDetailsLoading />;
  if (state.phase === 'notFound') return <CourseDetailsNotFound />;
  if (state.phase === 'error') {
    return <CourseDetailsError message={state.message} onRetry={retry} />;
  }

  const { course } = state;
  const hasSupportingLists =
    course.entryRequirements.length > 0 ||
    course.skills.length > 0 ||
    course.tags.length > 0;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb">
        <Link
          href={CATALOGUE_HREF}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-sky-800 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          <span aria-hidden="true">‹</span> Back to Course Catalogue
        </Link>
      </nav>

      {/* Announces the loaded course for assistive technology (FR-318). */}
      <p aria-live="polite" className="sr-only">
        Course details loaded for {course.title}.
      </p>

      {/*
        Each block is rendered once, in a single DOM order that works at every
        width (NFR-305). Mobile stacks it: identity → actions → key facts →
        description → supporting lists, so a learner can enquire and skim the
        essentials without scrolling the page. From `lg` the same markup becomes
        a two-column grid where the actions and key facts form one cohesive,
        sticky side panel beside the reading column.
      */}
      <article className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="lg:col-start-1 lg:col-end-3 lg:row-start-1">
          <CourseDetailHeader course={course} />
        </div>

        <div className="space-y-6 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-6">
          <CourseActions course={course} comparison={comparison} />
          <CourseKeyFacts course={course} />
        </div>

        <div className="space-y-8 lg:col-start-1 lg:row-start-2">
          <CourseOverview course={course} />

          {hasSupportingLists && (
            <section aria-labelledby="course-details-more-heading" className="space-y-6">
              <h2
                id="course-details-more-heading"
                className="text-xl font-semibold text-slate-900"
              >
                Requirements and outcomes
              </h2>
              <CourseRequirements requirements={course.entryRequirements} />
              <CourseSkills skills={course.skills} />
              <CourseTags tags={course.tags} />
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
