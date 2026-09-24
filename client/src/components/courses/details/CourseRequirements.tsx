/**
 * Entry requirements list (FR-307, FR-308). Rendered only when the course has
 * requirements, so an empty array omits the section cleanly.
 */
export function CourseRequirements({
  requirements,
}: {
  requirements: string[];
}): React.JSX.Element | null {
  if (requirements.length === 0) return null;

  return (
    <section aria-labelledby="course-requirements-heading">
      <h3
        id="course-requirements-heading"
        className="text-base font-semibold text-slate-900"
      >
        Entry requirements
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
        {requirements.map((requirement) => (
          <li key={requirement}>{requirement}</li>
        ))}
      </ul>
    </section>
  );
}
