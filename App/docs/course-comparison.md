# Course Comparison (Specification 04)

The comparison feature lets a learner shortlist up to **four** courses and review
them **side by side** before choosing one to open or enquire about.

It is **frontend-only**. There is no backend code, no new endpoint, no database,
and no persistence beyond the current browser session. It adds **no** AI,
agent, WebMCP/MCP, ranking, scoring, or recommendation behaviour — the table
simply lays the shared Course model out for a human to judge.

> Implements `.kiro/specs/04-course-comparison/`. Built on the Specification 02
> Course model and catalogue data; reuses the Specification 01 UI primitives.

## What a learner can do

| Action                         | Where                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| Add a course to the comparison | The **Compare** control on each catalogue card                         |
| Remove a course                | The same control (it toggles), or **Remove** in the comparison view    |
| See how many are selected      | The sticky **Compare (n)** bar, on every page while a selection exists |
| Compare side by side           | `/lifelong-learning/courses/compare`                                   |
| Open a course                  | **View details** → `/lifelong-learning/courses/:courseId`              |
| Enquire about a course         | **Enquire** → the Specification 05 enquiry entry point                 |
| Start over                     | **Clear comparison**, or **Back to Course Catalogue**                  |

## Selection rules

- **Identity** is the shared Course `id` — the same id used in routes, links,
  and enquiries. No new identifier is introduced.
- **Duplicates** are a no-op: adding a course already selected changes nothing,
  and the control shows the selected state.
- **Capacity is four.** A fifth add is rejected; the existing selection is never
  dropped or replaced. The control that cannot be used says why in its own
  accessible name and announces the reason when activated.
- **Order is insertion order**, so the same selection always renders the same
  columns in the same sequence.

## The shared comparison interface

Specification 04 owns comparison state and its rules. Other features consume
them through one hook and never re-implement them.

```ts
import {
  useComparison,
  MAX_COMPARISON_COURSES,
} from '@/components/comparison/comparison-context';

const {
  items, // Course[] — selected courses, in the order they were added
  add, // (course: Course) => 'added' | 'duplicate' | 'full'
  remove, // (courseId: string) => void
  has, // (courseId: string) => boolean
  clear, // () => void
  count, // number
  isFull, // boolean — count === max
  max, // number — MAX_COMPARISON_COURSES (4)
  status, // string — the last change, worded for a live region
} = useComparison();
```

`add` returns its outcome so a caller can react to a rejection without
re-deriving the rules. `status` is the same change described for assistive
technology; it is rendered once by `ComparisonAnnouncer`.

`useComparison()` **throws** outside a `ComparisonProvider`, so a missing mount
fails immediately instead of silently discarding a learner's shortlist.

Specification 03 consumes a structural subset of this interface (`add`,
`remove`, `has`, `isFull`, `max`) through its own `CourseComparisonSeam` type —
see
[`phase-1-integration.md`](./phase-1-integration.md).

## Structure

| File                                             | Role                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `components/comparison/comparison-context.tsx`   | `ComparisonProvider`, `useComparison`, `MAX_COMPARISON_COURSES`, session mirroring |
| `components/comparison/AddToCompareButton.tsx`   | Reusable add / remove control                                                      |
| `components/comparison/ComparisonAnnouncer.tsx`  | The single polite live region                                                      |
| `components/comparison/ComparisonBar.tsx`        | Sticky "Compare (n)" affordance                                                    |
| `components/comparison/ComparisonView.tsx`       | Page body: empty state, or the table plus its actions                              |
| `components/comparison/ComparisonTable.tsx`      | The attribute-by-attribute table                                                   |
| `components/comparison/routes.ts`                | Comparison, details, catalogue, and enquiry targets                                |
| `app/lifelong-learning/courses/compare/page.tsx` | The comparison route                                                               |

The provider, the live region, and the bar are mounted in the app shell
(`app/layout.tsx`) so a shortlist survives navigation between the catalogue, a
course's details, and the comparison view.

## State and data

State is a React context holding the selected `Course` items, captured at add
time — so the comparison view renders immediately with no fetch, no loading
state, and no duplicated catalogue querying. The shared Course model is reused
as-is; comparison introduces no second course data structure.

The selection is also mirrored into `sessionStorage` under
`eduagent.comparison`, so a reload or a directly-opened comparison URL keeps the
shortlist for the rest of the browsing session. This is a progressive
enhancement, and storage is treated as external input: it is parsed by a Zod
schema that reuses the shared `COURSE_SCHEMA`, so a stored entry can never be
handed out as a `Course` unless it really is one. An unreadable, malformed, or
oversized payload is discarded in full rather than restored partially, and every
read and write tolerates storage being unavailable. Nothing sensitive is stored,
and nothing leaves the browser.

Because items are captured at add time, a restored selection shows the values as
they were when the course was added. For synthetic, static course data that is
immaterial; if the data ever becomes live, refresh on hydration via
`coursesApi.getById` (FR-415 permits it).

## Compared attributes

Courses are columns and attributes are rows, so one attribute reads across every
course in a single line. In fixed order:

**Availability · Status · Course type · Discipline · Category · Level ·
Delivery mode · Duration · Intake · Fee · Eligibility**, then a **Next step**
row with each course's actions. The course title and code are the column
headers.

Every value comes from the shared Course model, rendered through the
Specification 02 label maps, `format.ts`, and `AvailabilityBadge`. No attribute
is invented or derived, and no value is highlighted as better than another.

## Accessibility

- A real `<table>` named by its `<caption>` (no competing `aria-label`, which
  would suppress it), with `<th scope="col">` per course and
  `<th scope="row">` per attribute, so a screen reader announces which course a
  value belongs to.
- The table sits in a bounded, **focusable** scroll region with a label, so
  keyboard users can scroll it horizontally on narrow screens.
- The add/remove control is a real `button` whose accessible name always names
  the course, so many cards on a page stay distinguishable. That name states the
  action the control will perform, so it carries no `aria-pressed` — a toggle
  state beside a label describing the _next_ action reads as a contradiction.
- At capacity the control uses `aria-disabled` rather than `disabled`: a natively
  disabled button is skipped by keyboard navigation, so its reason would never
  be reachable. Activating it is a no-op that announces why.
- One always-mounted polite live region announces every add, remove, rejection,
  and clear. A region inserted at the moment of the change is frequently not
  announced, which is why it outlives the individual controls.
- Availability is text plus a glyph, never colour alone.

## Responsive behaviour

The table keeps its side-by-side shape at every width instead of collapsing into
something that no longer compares. Columns have a minimum width, the attribute
column is sticky, and narrower screens scroll the table horizontally inside its
bounded region.

## Tests

`npm run test --workspace client`

- `comparison-context.test.tsx` — add, remove, `has`, duplicate no-op, the limit
  of four, `count`/`isFull`/`max`, `clear`, insertion order, the announced
  wording, failing outside a provider, and session restore — including rejecting
  a payload that is malformed, oversized, missing a field the Course model
  promises, or carrying an enum value outside the shared model.
- `AddToCompareButton.test.tsx` — naming the course, toggling to remove,
  announcing changes, explaining itself at the limit, and keyboard-only
  operation.
- `ComparisonView.test.tsx` — the empty state, side-by-side attributes with
  header associations, fixed attribute order, details/enquiry/back navigation,
  remove, clear, and the scrollable region.
- `ComparisonBar.test.tsx` — the count, its link, and staying out of the way.
- `CourseCard.test.tsx` — the card offers the control (Specification 02 test,
  extended additively).

## Not implemented here

Details internals (Specification 03), the enquiry workflow (Specification 05 —
comparison only links to its entry point), catalogue search/filter/sort/
pagination (Specification 02), any backend logic or endpoint, accounts, auth,
and **all** AI/agent/WebMCP/MCP functionality including AI comparison,
recommendations, ranking, and scoring. Those belong to Phase 2, which is a
separate set of specifications written only after Phase 1 is complete.

The details page now consumes the shared comparison interface from the route host
so its add/remove control follows the same duplicate/limit rules as catalogue
cards and the comparison view.
