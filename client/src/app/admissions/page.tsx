import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: 'Admissions — EduAgent Connect',
  description:
    'Application journeys, entry requirements, and intake information for prospective learners.',
};

export default function AdmissionsPage(): React.JSX.Element {
  return (
    <PagePlaceholder
      title="Admissions"
      intro="Application journeys, entry requirements, and intake information for prospective learners."
    />
  );
}
