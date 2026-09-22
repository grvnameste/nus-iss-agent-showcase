import { LifelongLearningNav } from '@/components/layout/LifelongLearningNav';

/**
 * Lifelong-Learning segment layout (Spec 06, FR-615, design §4).
 *
 * Renders the shared LL sub-navigation above every route under
 * `/lifelong-learning` (landing, catalogue, details, comparison, enquiry), so
 * the Course Catalogue and the Comparison view are always reachable from within
 * the LL area. Placing the sub-nav here — rather than inside any feature
 * component — keeps it consistent across LL routes and avoids touching
 * Spec 02–05 feature internals.
 */
export default function LifelongLearningLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <div className="space-y-6">
      <LifelongLearningNav />
      {children}
    </div>
  );
}
