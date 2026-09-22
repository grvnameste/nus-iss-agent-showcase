# Course Enquiry (Specification 05)

The human website's **first WRITE capability**: a learner submits an enquiry
about a course and receives a synthetic reference number. It follows the
Specification 01 layering end to end —
**Human UI → REST API → Controller → Service → Repository → synthetic storage** —
and reuses the Spec 01 validation boundary, error envelope, logger and security
middleware.

> **Demonstration only.** All courses are synthetic, enquiries are stored in the
> running server's memory, and nothing is sent onward: no email, no CRM, no
> external system. **No** WebMCP / MCP / AI-agent functionality is implemented
> here; agent-driven submission belongs to a future phase.

---

## User journey

```
Course Catalogue → Course Details → Enquire
    → Enquiry form → validate → submit → Confirmation (reference + status + next steps)
```

The comparison view (Spec 04) links to the same entry point.

## Routes and contracts produced

| Contract | Value |
| -------- | ----- |
| Enquiry entry route | `/lifelong-learning/courses/:courseId/enquire` |
| Submission endpoint | `POST /api/enquiries` |
| Enquiry-type enum | `general \| course_content \| fees_funding \| admissions \| other` |

Spec 05 **owns** the entry route/param contract. Specs 03 and 04 link to it
through a single helper, `enquiryHref` in
`client/src/components/courses/details/routes.ts`, so the target is changeable in
one edit.

## API — `POST /api/enquiries`

### Request

```jsonc
{
  "name": "Alex Tan",                    // 1–100 chars, trimmed
  "email": "alex.tan@example.com",       // valid email, ≤254, lower-cased
  "phone": "+65 9123 4567",              // optional; blank is treated as absent
  "courseId": "product-design-adv",      // shared Course id (Spec 02)
  "enquiryType": "fees_funding",         // one of the enum above
  "message": "Is subsidised funding available?" // 10–2000 chars
}
```

Unknown fields are stripped, so a client cannot smuggle extra data into storage.

### Success — `201`

```jsonc
{
  "data": {
    "reference": "ENQ-2026-000001",
    "courseId": "product-design-adv",
    "courseTitle": "Advanced Product Design",
    "status": "received",
    "createdAt": "2026-09-22T02:49:28.173Z"
  }
}
```

The response deliberately **excludes** every submitted personal field — the
confirmation needs none of them.

### Errors (Spec 01 envelope)

| Status | Code | When |
| ------ | ---- | ---- |
| `400` | `VALIDATION_ERROR` | Body fails the Zod schema; `details` carries per-field issues. Also returned for malformed JSON. |
| `404` | `NOT_FOUND` | The referenced course does not exist or is not publicly listable — the same rule `GET /api/courses/:courseId` applies. |
| `413` | `VALIDATION_ERROR` | Body exceeds the 64 kB limit. |
| `500` | `INTERNAL` | Unexpected; sanitised, never carries internals. |

```jsonc
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request parameters",
             "details": [ { "path": ["email"], "message": "Enter a valid email address" } ] } }
```

## Backend design

| Layer | File | Responsibility |
| ----- | ---- | -------------- |
| Domain | `server/src/domain/enquiry.ts` | Enquiry types, the enquiry-type enum, field bounds, and the **authoritative Zod schema** |
| Repository | `server/src/repositories/enquiry-repository.ts` | `create` / `findByReference` over a synthetic in-memory array, behind an interface |
| Service | `server/src/services/enquiry-service.ts` | All business rules: verify course → build record → persist → return |
| Controller | `server/src/controllers/enquiry-controller.ts` | HTTP only: call the service, map its typed error, shape the envelope |
| Route | `server/src/routes/enquiries.ts` | `POST /` behind `validate('body', enquiryInputSchema)` |

**Course verification.** The service calls the existing Spec 02 Course Service
`getById`, which already applies the listability rule — so an unlisted course
simply reads back as `null` and no course logic is duplicated. An enquiry for
such a course is rejected with a typed `CourseUnavailableError`, which the
controller maps to the structured `404`.

**Reference numbers.** Format `ENQ-<year>-<6-digit sequence>`, e.g.
`ENQ-2026-000001`. Both the record id and the reference come from an **injected
id generator** paired with an **injected clock**, so tests fully control identity
and timestamps. The default generator is an in-process monotonic counter — enough
for a synthetic demonstration, and deliberately not a distributed-uniqueness
scheme. References restart from `000001` whenever the server restarts, because
the store is in memory.

**Storage.** A plain array inside `InMemoryEnquiryRepository`; each instance owns
its own, and records are copied in and out so a caller cannot mutate what is
stored. No database, no file I/O. The interface is what allows a database-backed
implementation later without touching the Service contract.

## Frontend design

| Piece | File |
| ----- | ---- |
| Route | `client/src/app/lifelong-learning/courses/[courseId]/enquire/page.tsx` |
| Page body / state | `client/src/components/enquiry/CourseEnquiry.tsx` |
| Form | `client/src/components/enquiry/EnquiryForm.tsx` |
| Labelled field + a11y wiring | `client/src/components/enquiry/EnquiryField.tsx` |
| Confirmation | `client/src/components/enquiry/EnquiryConfirmation.tsx` |
| Loading / unavailable / error | `client/src/components/enquiry/EnquiryStates.tsx` |
| Demonstration notice | `client/src/components/enquiry/SyntheticDataNotice.tsx` |
| API client | `client/src/lib/enquiries/api.ts` |
| Types / labels / bounds | `client/src/lib/enquiries/types.ts` |
| Advisory validation | `client/src/lib/enquiries/validation.ts` |

The page loads the course through the Spec 02 `coursesApi.getById` so the title
shown is the catalogue's own, then holds two pieces of state and no business
rules: the course (`loading | ready | unavailable | error`) and the submission
(`idle | submitting | success | error`).

**The associated course is context, not an input.** It is displayed read-only and
travels as an id, so a learner cannot enquire about a course they did not choose.

**Duplicate-submit protection.** The submit control is disabled while a request
is in flight, a guard in the state updater makes a second call impossible
regardless, and on success the confirmation **replaces** the form — there is no
submit control left to press. No authentication or idempotency-key machinery.

**Error handling.** Inline field errors from client validation; server `400`
issues mapped back onto the offending controls; a user-friendly, retryable
message for network/server failures that preserves what the learner typed; and
the unavailable-course state if the course disappears between opening the form
and submitting.

## Validation

Validation exists in **two places with different jobs**:

- **Client (`validation.ts`)** — advisory, for immediate field-level feedback.
  Errors appear only after the first submit attempt, then clear live as fields
  are fixed. A blocked submit also announces a form-level summary and moves
  focus to the first invalid control. Server-reported field issues clear as soon
  as the learner edits the field they describe, so a stale message never lingers.
- **Server (`enquiry.ts`)** — **authoritative**. Every submission is
  re-validated at the request boundary regardless of what the client did. A
  payload posted straight to the API, bypassing the form entirely, is rejected
  the same way.

| Field | Rule |
| ----- | ---- |
| `name` | required, trimmed, ≤ 100 |
| `email` | required, valid format, ≤ 254, lower-cased |
| `phone` | optional; blank = absent; permissive international format, ≤ 32 |
| `courseId` | required, non-empty, ≤ 200 |
| `enquiryType` | required, within the enum |
| `message` | required, 10–2000 |

## Privacy & security

- **Backend is the trust boundary** — Zod validates every enquiry at the
  boundary; client validation is never relied upon (SR-501).
- **Minimisation** — only justified fields are collected, and phone is optional.
- **No PII in logs** — only Spec 01 request-level logging (method, path, status,
  duration). This is verified by a test that asserts against **Pino's actual
  output stream**, not the arguments handed to the logger, because pino-http
  passes the live request object and the serialisers are what reduce it.
- **Bounded input** — a 64 kB JSON body limit plus per-field maximums. Oversized
  and malformed bodies are reported as client errors (413/400) rather than
  surfacing as a generic 500.
- **Sanitised errors** — responses use the Spec 01 envelope; internals and stack
  traces never reach the client.
- **No secrets in the client** — it holds no credentials and calls only the
  public API through the Spec 01 boundary.
- Helmet and the CORS allow-list from Spec 01 apply unchanged.

**Known gaps, by design.** The in-memory store is unbounded and the endpoint is
not rate-limited. Specification 05 deliberately stops short of both: the store is
synthetic and discarded on restart, and the spec calls for reasonable constraints
rather than abuse infrastructure. A production deployment would need a real store
with retention rules and rate limiting at the edge.

## Accessibility

Labelled controls with real `<label for>`; `aria-invalid` plus
`aria-describedby` linking each control to its hint and error message; a single
`aria-live` region announcing "Sending your enquiry…", the confirmation
reference, or the failure; `role="alert"` on the form-level error; a correct
heading hierarchy; visible focus rings from the Spec 01 primitives; and a
single-column layout at mobile widths that becomes two columns from `sm`.

## Tests

| Scope | File |
| ----- | ---- |
| Schema rules | `server/src/domain/enquiry.test.ts` |
| Repository | `server/src/repositories/enquiry-repository.test.ts` |
| Service (deterministic id/clock) | `server/src/services/enquiry-service.test.ts` |
| API + log privacy | `server/src/routes/enquiries.test.ts` |
| Advisory validation | `client/src/lib/enquiries/validation.test.ts` |
| API client | `client/src/lib/enquiries/api.test.ts` |
| Form/flow behaviour | `client/src/components/enquiry/CourseEnquiry.test.tsx` |
| Client ↔ real API | `client/src/lib/enquiries/enquiry-flow.integration.test.tsx` |

The integration test runs the **real Express app in-process** on an ephemeral
port and drives the **real form** against it, so it is the test that would catch
a request/response contract drift between the two workspaces. It also asserts
**parity** between the client's mirrored enum/bounds and the server's originals,
so raising a bound on one side without the other fails the build rather than
silently leaving the form's helper text lying to the learner.

## Running it

```bash
npm install          # at App/
npm run dev          # client on :3000, server on :4000
```

Then open a course from `/lifelong-learning/courses`, choose **Enquire about this
course**, submit the form, and check the confirmation. Or call the API directly:

```bash
curl -X POST http://localhost:4000/api/enquiries \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alex Tan","email":"alex.tan@example.com","courseId":"product-design-adv","enquiryType":"fees_funding","message":"Is subsidised funding available?"}'
```

Verification gates:

```bash
npm run typecheck && npm run lint && npm test --workspace server && npm test --workspace client && npm run build
```

## Not in this specification

Real email/CRM/notification delivery; payment; authentication; accounts; any
external or production system; a database or any persistence beyond the
in-memory store; course details or comparison internals; and **all** WebMCP /
MCP / AI-agent / agent-tool / agent-permission functionality, including automated
or agent-driven enquiry submission. Those belong to later phases.
