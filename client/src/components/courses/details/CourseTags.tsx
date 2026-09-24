/**
 * Course tags (FR-307, FR-308). Rendered only when the course has tags. Tags are
 * labels here, not filters — catalogue filtering stays in Spec 02.
 */
export function CourseTags({ tags }: { tags: string[] }): React.JSX.Element | null {
  if (tags.length === 0) return null;

  return (
    <section aria-labelledby="course-tags-heading">
      <h3 id="course-tags-heading" className="text-base font-semibold text-slate-900">
        Topics
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}
