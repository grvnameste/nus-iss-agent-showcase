import { cn } from '@/lib/cn';

/**
 * Demonstration notice (FR-516, FR-519).
 *
 * EduAgent Connect is a prototype over synthetic data. Anyone typing their real
 * details into a form deserves to know, before they submit, that nothing is
 * sent anywhere — so the notice appears both beside the form and on the
 * confirmation.
 */
export function SyntheticDataNotice({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <p
      className={cn(
        'rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900',
        className,
      )}
    >
      <span className="font-semibold">Demonstration only.</span> This enquiry form uses
      synthetic course data and stores submissions in memory for the duration of the demo.
      No real institution has been contacted, no email is sent, and nothing is shared with
      a third party. Please do not enter information you would not want to type into a
      prototype.
    </p>
  );
}
