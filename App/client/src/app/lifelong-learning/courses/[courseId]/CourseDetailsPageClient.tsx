'use client';

import { useComparison } from '@/components/comparison/comparison-context';
import { CourseDetails } from '@/components/courses/CourseDetails';

export function CourseDetailsPageClient({
  courseId,
}: {
  courseId: string;
}): React.JSX.Element {
  const { add, remove, has, isFull, max } = useComparison();

  return (
    <CourseDetails
      courseId={courseId}
      comparison={{
        add,
        remove,
        has,
        isFull,
        max,
      }}
    />
  );
}
