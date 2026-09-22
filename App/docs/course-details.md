# Course Details — Page & Contracts (Specification 03)

The Course Details page is the human-facing view a learner lands on after
choosing a course in the catalogue. It presents the complete course record and
offers the next actions: **enquire**, optionally **add to comparison**, and
**back to the catalogue**.

> **Scope note.** This is a **human-facing** page and a **frontend-only**
> change. It adds **no** backend code, no new endpoint, and no new course
> business logic — it reuses the Specification 02 Course capability. AI-agent /
> WebMCP / MCP functionality is **not** implemented and remains a **future
> phase**. All course data is **synthetic and fictional**; there is no Republic
> Polytechnic (or any) production integration.

## Route

|      |                                                                                   |
| ---- | --------------------------------------------------------------------------------- |
| Path | `/lifelong-learning/courses/:courseId`                                            |
| Host | `client/src/app/lifelong-learning/courses/[courseId]/page.tsx` (server component) |
| Body | `client/src/components/courses/CourseDetails.tsx` (client component)              |

The route was established by Specification 02 and is kept unchanged (AD-302), so
existing catalogue links keep working. The page is **deep-linkable**: the fetch
is keyed on `courseId`, so opening the URL directly renders that course.

> A top-level `/courses/:courseId` alias is deliberately **not** added here; any
> route alias is an integration decision (Specification 06).

## Where it lives

| Concern                              | File                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| Orchestration, request state, layout | `client/src/components/courses/CourseDetails.tsx`              |
| Identity + availability              | `client/src/components/courses/details/CourseDetailHeader.tsx` |
| Descriptions                         | `client/src/components/courses/details/CourseOverview.tsx`     |
| Structured attributes (`dl`)         | `client/src/components/courses/details/CourseKeyFacts.tsx`     |
| Entry requirements                   | `client/src/components/courses/details/CourseRequirements.tsx` |
| Skills                               | `client/src/components/courses/details/CourseSkills.tsx`       |
| Tags                                 | `client/src/components/courses/details/CourseTags.tsx`         |
| Action bar                           | `client/src/components/courses/details/CourseActions.tsx`      |
| Loading / not-found / error          | `client/src/components/courses/details/DetailStates.tsx`       |
| Navigation contracts                 | `client/src/components/courses/details/routes.ts`              |
| Optional comparison seam (type only) | `client/src/components/courses/details/comparison-seam.ts`     |
| Date presentation                    | `client/src/components/courses/details/format-date.ts`         |
| Tests                                | `client/src/components/courses/CourseDetails.test.tsx`         |

Only `CourseDetails` performs data access; every other component is presentation
that receives an already-fetched `Course`.

## Reused capability (no duplicated logic)

The page retrieves its course through the **existing** Specification 02 stack:

```
CourseDetails → coursesApi.getById(courseId, signal)
              → GET /api/courses/:courseId
              → CourseController → CourseService.getById → CourseRepository → data
```

- The shared client `Course` type (`client/src/lib/courses/types.ts`) is the
  single source of truth for course shape. **The Course model is unchanged.**
- Labels come from the Spec 02 label maps (`COURSE_TYPE_LABELS`,
  `COURSE_LEVEL_LABELS`, `DELIVERY_MODE_LABELS`, `AVAILABILITY_LABELS`) and
  values from `format.ts` (`formatFee`, `formatDuration`).
- Availability reuses the Spec 02 `AvailabilityBadge`.
- **Listability stays server-side.** `GET /api/courses/:courseId` returns 404 for
  both unknown ids and courses that are not publicly listable, so the page treats
  any course it receives as a real, listable offering and never re-implements the
  rule client-side.

Dates (`startDate`, `applicationDeadline`) are formatted for display by a small
local helper (`format-date.ts`) in UTC, so a given course id always renders the
same dates regardless of the viewer's timezone. It is local to this feature so
the shared Spec 02 `format.ts` stays untouched.

## What the page shows

- **Identity:** discipline, availability badge, the page's single `H1` (title),
  course code, category.
- **Descriptions:** short description as the lead, then the full description.
- **Key facts (`dl`):** course type, level, delivery mode, duration, intake,
  start date, application deadline, fee (with currency), eligibility.
- **Supporting lists (rendered only when non-empty):** entry requirements,
  skills, tags.

Only fields that exist in the shared Course model are shown; none are invented.

## States

| State     | Trigger                              | Behaviour                                                                                     |
| --------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Loading   | request in flight                    | Skeleton + `role="status"`/`aria-live="polite"` announcement                                  |
| Found     | 200                                  | Full details; a visually-hidden live region announces the loaded course                       |
| Not found | 404 (unknown **or** non-listable id) | "Course not found" panel with a link to the catalogue — not an error                          |
| Error     | any other failure                    | `role="alert"` panel with the sanitised message, a **Try again** button, and a catalogue link |

Requests use an `AbortController` (cancelled on unmount / id change) and a
sequence guard, so a slow earlier response can never overwrite a newer one.
Retry increments a reload token, which re-issues the request. Error copy comes
from `CourseApiError`'s already-sanitised message — internals and stack traces
are never surfaced.

## Actions and cross-spec contracts

### Produced — enquiry entry point (consumed by Specification 05)

The primary action links to the enquiry entry point, carrying the course
identity in the route:

```
/lifelong-learning/courses/:courseId/enquire
```

This is encoded in one place, `details/routes.ts` (`enquiryHref`). **Specification
05 owns the concrete enquiry route and params**; this is the planned target
agreed in the Phase 1 integration reference. If Spec 05 finalises a different
target, `enquiryHref` is the single line to change.

> Until Specification 05 lands, that route does not exist yet, so following the
> link reaches the application's not-found page. The page itself is unaffected.

### Consumed — add to comparison (owned by Specification 04, optional)

`CourseDetails` accepts an **optional** `comparison` prop typed by
`details/comparison-seam.ts` — the structural subset of Spec 04's documented
`useComparison()` interface that this page needs (`add`, `remove`, `has`,
`isFull`, `max`):

- When it is **supplied**, the page renders an **Add to comparison** button that
  delegates entirely to the interface: `has(id)` toggles the action label
  between **Add to comparison** and **Remove from comparison**, while `isFull`
  drives the disabled-at-capacity state and its announced hint.
- When it is **absent**, the affordance is omitted and the rest of the page works
  unchanged.

**No comparison internals live here** — no state, no duplicate rule, no capacity
rule. The seam is a prop rather than a context owned by this feature, precisely
so Spec 04 stays the owner; the route host supplies the real
`useComparison()` value through a small client wrapper.

### Back to catalogue

A breadcrumb link and an action-bar link, both to `/lifelong-learning/courses`.

## Layout

One DOM order serves every width (no duplicated markup):

- **Mobile:** a single column — identity → actions → key facts → description →
  supporting lists — so a learner can enquire and skim the essentials without
  scrolling the page.
- **Tablet:** the same stack, with key facts laid out in two columns.
- **Desktop (`lg`+):** a two-column grid — the reading column beside a sticky
  side panel holding the actions and key facts.

## Accessibility

- Exactly one `H1` (the course title); `H2` sections, `H3` sub-sections, no
  skipped levels.
- Semantic `article` for the course, `dl` for key facts, `ul` for lists.
- Navigation uses links and the in-page comparison action uses a button, so
  semantics match behaviour; all are keyboard-operable with a visible focus ring.
- Availability is conveyed by **text plus a glyph**, never colour alone.
- Loading and not-found use `role="status"`/`aria-live="polite"`; errors use
  `role="alert"`; the loaded course is announced in a visually-hidden live region.

Full WCAG 2.1 AA conformance still requires later manual assistive-technology
testing (Specification 07).

## Tests

`client/src/components/courses/CourseDetails.test.tsx` runs against a **faked
`coursesApi`** (the transport seam — no network, no timers), covering:
full information rendering, request-by-id, availability as text, the Enquire
target, the catalogue links, 404 → not-found, the announced loading state,
error + retry re-request, the comparison affordance present/absent/add/remove/at-limit,
the accessibility baseline, and abort-on-unmount.

Run them with:

```bash
npm run test --workspace client
```

Cross-feature journeys (catalogue → details → comparison → enquiry) are
deliberately **not** duplicated here; they belong to Specifications 06 and 07.

## Future extensibility (conceptual only)

Because the page is pure presentation over `CourseService.getById`, a future
Phase 2 specification could expose that same capability as a
`get_course_details`-style agent capability without touching this page. **No
agent, WebMCP, MCP, tool, registry, permission, or AI-model code exists here.**
