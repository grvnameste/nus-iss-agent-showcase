import type { Metadata } from 'next';
import { EnquiryWithNotification } from './EnquiryWithNotification';
import { CourseBreadcrumbs } from '../CourseBreadcrumbs';

export const metadata: Metadata = {
  title: 'Course enquiry — EduAgent Connect',
  description:
    'Send an enquiry about a synthetic continuing-education course and receive a demonstration reference number. No real institution is contacted.',
};

/**
 * Course enquiry route (Specification 05, design §10, AD-509) at
 * /lifelong-learning/courses/[courseId]/enquire.
 *
 * Spec 05 owns this route/param contract; Specifications 03 and 04 already link
 * to it through `enquiryHref`, so the course identity arrives in the path and
 * the page is deep-linkable. The server component only hands the id to the
 * client body, which loads the course and hosts the form.
 */
export default function CourseEnquiryPage({
  params,
}: {
  params: { courseId: string };
}): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <CourseBreadcrumbs courseId={params.courseId} variant="enquiry" />
      <EnquiryWithNotification courseId={params.courseId} />
    </main>
  );
}
