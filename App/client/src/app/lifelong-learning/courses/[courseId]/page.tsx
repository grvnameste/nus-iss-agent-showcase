import type { Metadata } from 'next';
import { CourseDetailsPageClient } from './CourseDetailsPageClient';

export const metadata: Metadata = {
  title: 'Course details — EduAgent Connect',
  description:
    'Full details for a synthetic continuing-education course: description, key facts, entry requirements, skills, availability, and how to enquire. For demonstration only.',
};

/**
 * Course Details route (FR-301, FR-303, AD-302) at
 * /lifelong-learning/courses/[courseId].
 *
 * Server-component host: it passes the route's `courseId` to a client wrapper
 * that wires the shared comparison interface into `CourseDetails`, while the
 * details body still fetches through `GET /api/courses/:courseId`. Because the
 * fetch is keyed on the id, the page is deep-linkable — opening the URL
 * directly renders that course.
 */
export default function CourseDetailsPage({
  params,
}: {
  params: { courseId: string };
}): React.JSX.Element {
  return <CourseDetailsPageClient courseId={params.courseId} />;
}
