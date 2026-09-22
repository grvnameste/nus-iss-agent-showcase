import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: 'Education — EduAgent Connect',
  description:
    'Full-time and diploma programmes offered by the platform, outlining the academic pathways available to prospective students.',
};

export default function EducationPage(): React.JSX.Element {
  return (
    <PagePlaceholder
      title="Education"
      intro="Full-time and diploma programmes offered by the platform. This section outlines the academic pathways available to prospective students."
    />
  );
}
