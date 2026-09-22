'use client';

import { useCallback } from 'react';
import { CourseEnquiry } from '@/components/enquiry/CourseEnquiry';
import { useOptionalNotify } from '@/components/notifications/notification-context';
import type { EnquiryConfirmationResult } from '@/lib/enquiries/types';

/**
 * Integration host for the enquiry route (Specification 06, FR-621, TASK-615).
 *
 * A thin client wrapper that adopts the global notification channel for the
 * *cross-feature* "enquiry submitted" confirmation, wiring it at the clean
 * route-host seam rather than reaching into Spec 05 form internals. It passes
 * `onSubmitted` to Spec 05's `CourseEnquiry`, which already owns the submission
 * flow and the local confirmation state.
 *
 * This is purely additive: the enquiry's own confirmation view and `aria-live`
 * status region remain the primary feedback. The notification degrades to a
 * no-op where no channel is mounted (`useOptionalNotify`).
 */
export function EnquiryWithNotification({
  courseId,
}: {
  courseId: string;
}): React.JSX.Element {
  const notifier = useOptionalNotify();

  const handleSubmitted = useCallback(
    (result: EnquiryConfirmationResult): void => {
      notifier?.notify({
        tone: 'success',
        message: `Enquiry submitted — reference ${result.reference}.`,
      });
    },
    [notifier],
  );

  return <CourseEnquiry courseId={courseId} onSubmitted={handleSubmitted} />;
}
