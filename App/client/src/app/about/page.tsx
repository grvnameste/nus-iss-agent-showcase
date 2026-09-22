import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

export const metadata: Metadata = {
  title: 'About — EduAgent Connect',
  description:
    'EduAgent Connect is an original demonstration website showing how an education platform can be transformed into an Agent-Ready experience. Synthetic data only.',
};

export default function AboutPage(): React.JSX.Element {
  return (
    <PagePlaceholder
      title="About"
      intro="EduAgent Connect is an original demonstration website showing how an education platform can be transformed into an Agent-Ready experience. It uses synthetic data and does not integrate with any real institution."
    />
  );
}
