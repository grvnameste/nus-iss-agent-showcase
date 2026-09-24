'use client';

import { useEffect, useRef, useState } from 'react';
import { coursesApi } from '@/lib/courses/api';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import {
  courseDetailsBreadcrumbs,
  courseEnquiryBreadcrumbs,
} from '@/components/layout/course-breadcrumbs';
import { courseDetailsHref } from '@/components/comparison/routes';

/**
 * Route-level breadcrumb host for the course Details and Enquiry routes
 * (FR-617, design §4).
 *
 * The course title crumb derives from the loaded Course, but the Spec 03/05
 * feature bodies own their own request state and this integration must not touch
 * their internals. So this thin host resolves just the title through the same
 * Spec 02 client (a browser-cached GET on these routes) and renders the shared
 * {@link Breadcrumbs}. It is a route-host concern only — no feature logic and no
 * new endpoint.
 *
 * Until the title resolves the crumb shows a neutral "Course" label so a
 * deep-linked route still renders a complete, correctly-ordered trail
 * immediately (FR-619); it is replaced with the real title once loaded.
 */
const PENDING_TITLE = 'Course';

export function CourseBreadcrumbs({
  courseId,
  variant,
}: {
  readonly courseId: string;
  readonly variant: 'details' | 'enquiry';
}): React.JSX.Element {
  const [title, setTitle] = useState<string | null>(null);

  // Guards against a slow earlier response overwriting a newer one.
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setTitle(null);

    coursesApi
      .getById(courseId, controller.signal)
      .then((course) => {
        if (seq === requestSeq.current) setTitle(course.title);
      })
      .catch(() => {
        // A missing/unavailable course is surfaced by the feature body; the
        // breadcrumb simply keeps its neutral placeholder rather than erroring.
      });

    return () => controller.abort();
  }, [courseId]);

  const label = title ?? PENDING_TITLE;
  const items =
    variant === 'enquiry'
      ? courseEnquiryBreadcrumbs(label, courseDetailsHref(courseId))
      : courseDetailsBreadcrumbs(label);

  return <Breadcrumbs items={items} />;
}
