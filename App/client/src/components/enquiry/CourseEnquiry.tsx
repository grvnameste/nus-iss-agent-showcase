'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { coursesApi, CourseApiError } from '@/lib/courses/api';
import { enquiriesApi, EnquiryApiError } from '@/lib/enquiries/api';
import type { Course } from '@/lib/courses/types';
import type { EnquiryConfirmationResult, EnquiryInput } from '@/lib/enquiries/types';
import { EnquiryForm } from './EnquiryForm';
import { EnquiryConfirmation } from './EnquiryConfirmation';
import {
  EnquiryCourseError,
  EnquiryCourseUnavailable,
  EnquiryLoading,
} from './EnquiryStates';

/**
 * Enquiry page body (Specification 05, design §10).
 *
 * Owns two pieces of state and no business rules: which course the enquiry is
 * about (loaded through the Spec 02 client so the title shown is the catalogue's
 * own), and where the submission has got to. Validation, reference generation
 * and course availability all belong to the backend (NFR-501) — this component
 * only decides what the learner sees.
 */

type CourseState =
  | { phase: 'loading' }
  | { phase: 'ready'; course: Course }
  | { phase: 'unavailable'; message?: string }
  | { phase: 'error'; message: string };

type SubmissionState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'success'; result: EnquiryConfirmationResult }
  | { phase: 'error'; message: string; fieldErrors?: Record<string, string> };

const GENERIC_SUBMIT_ERROR = 'We could not submit your enquiry. Please try again.';

export function CourseEnquiry({ courseId }: { courseId: string }): React.JSX.Element {
  const [courseState, setCourseState] = useState<CourseState>({ phase: 'loading' });
  const [submission, setSubmission] = useState<SubmissionState>({ phase: 'idle' });
  const [reloadToken, setReloadToken] = useState(0);

  // Guards against a slow earlier response overwriting a newer one.
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setCourseState({ phase: 'loading' });

    coursesApi
      .getById(courseId, controller.signal)
      .then((course) => {
        if (seq === requestSeq.current) setCourseState({ phase: 'ready', course });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || seq !== requestSeq.current) return;
        // A 404 covers both "no such course" and "not listable"; the distinction
        // stays server-side, so one clear message covers both (FR-503, FR-517).
        if (error instanceof CourseApiError && error.status === 404) {
          setCourseState({ phase: 'unavailable' });
          return;
        }
        setCourseState({
          phase: 'error',
          message:
            error instanceof CourseApiError
              ? error.message
              : 'Something went wrong. Please try again.',
        });
      });

    return () => controller.abort();
  }, [courseId, reloadToken]);

  const retryCourse = useCallback(() => setReloadToken((token) => token + 1), []);

  // Duplicate-submit protection (FR-518). The form also disables its control,
  // but this ref is the guarantee: it is read and set outside React's state
  // machinery, so it holds even where a render or an updater runs twice.
  const inFlight = useRef(false);

  const submit = useCallback((input: EnquiryInput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmission({ phase: 'submitting' });

    void enquiriesApi
      .submit(input)
      .then((result) => {
        // Deliberately stays true: a confirmed enquiry is never resubmittable.
        setSubmission({ phase: 'success', result });
      })
      .catch((error: unknown) => {
        // A failure is retryable, so the guard is released (FR-517).
        inFlight.current = false;

        if (error instanceof EnquiryApiError) {
          // The course vanished between opening the form and submitting: show
          // the unavailable state rather than a form-level error.
          if (error.code === 'NOT_FOUND') {
            setCourseState({ phase: 'unavailable', message: error.message });
            setSubmission({ phase: 'idle' });
            return;
          }
          setSubmission({
            phase: 'error',
            message: error.message,
            ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
          });
          return;
        }
        // Anything unexpected is reported generically — never raw (SR-503).
        setSubmission({ phase: 'error', message: GENERIC_SUBMIT_ERROR });
      });
  }, []);

  if (courseState.phase === 'loading') return <EnquiryLoading />;
  if (courseState.phase === 'unavailable') {
    return (
      <EnquiryCourseUnavailable
        {...(courseState.message ? { message: courseState.message } : {})}
      />
    );
  }
  if (courseState.phase === 'error') {
    return <EnquiryCourseError message={courseState.message} onRetry={retryCourse} />;
  }

  const { course } = courseState;
  const courseHref = `/lifelong-learning/courses/${encodeURIComponent(course.id)}`;

  return (
    <div className="space-y-6">
      {/* Single live region for submission progress and outcome (NFR-504). */}
      <p role="status" aria-live="polite" className="sr-only">
        {submission.phase === 'submitting' && 'Sending your enquiry…'}
        {submission.phase === 'success' &&
          `Enquiry received. Your reference number is ${submission.result.reference}.`}
        {submission.phase === 'error' && submission.message}
      </p>

      {submission.phase === 'success' ? (
        <EnquiryConfirmation result={submission.result} courseHref={courseHref} />
      ) : (
        <EnquiryForm
          course={course}
          submitting={submission.phase === 'submitting'}
          {...(submission.phase === 'error' ? { submitError: submission.message } : {})}
          {...(submission.phase === 'error' && submission.fieldErrors
            ? { serverFieldErrors: submission.fieldErrors }
            : {})}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
