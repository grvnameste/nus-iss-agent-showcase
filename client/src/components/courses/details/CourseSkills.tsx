/**
 * Skills gained (FR-307, FR-308), as an accessible list of chips. Rendered only
 * when the course lists skills.
 */
export function CourseSkills({ skills }: { skills: string[] }): React.JSX.Element | null {
  if (skills.length === 0) return null;

  return (
    <section aria-labelledby="course-skills-heading">
      <h3 id="course-skills-heading" className="text-base font-semibold text-slate-900">
        Skills you will gain
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li
            key={skill}
            className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800 ring-1 ring-inset ring-sky-200"
          >
            {skill}
          </li>
        ))}
      </ul>
    </section>
  );
}
