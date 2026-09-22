import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: 'Industry — EduAgent Connect',
  description:
    'Partnerships, workforce collaboration, and industry-aligned learning opportunities.',
};

export default function IndustryPage(): React.JSX.Element {
  return (
    <PagePlaceholder
      title="Industry"
      intro="Partnerships, workforce collaboration, and industry-aligned learning opportunities."
    />
  );
}
