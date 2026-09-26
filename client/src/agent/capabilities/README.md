# Agent Capabilities (Spec 09)

The **shared capability catalogue** for EduAgent Connect's Agent-Ready layer. This
is the single contract that both the browser **WebMCP** integration (Spec 11) and
the standalone **MCP server** (Spec 12) build on — two interfaces over the *same*
capabilities, never two copies of the business logic.

Capabilities **describe and dispatch only**. Every catalogue/enquiry rule lives in
the backend services and is reached through the transport; nothing here reaches
into `window`/`fetch`/`document` directly (that stays behind the WebMCP adapter and
the injected collaborators).

## Files

| File | Purpose |
| ---- | ------- |
| `schemas.ts` | Zod input/output schemas, **reusing** `@/lib/courses` `COURSE_SCHEMA` and `@/lib/enquiries` constants (no third schema copy). |
| `definitions.ts` | The seven `CapabilityDefinition`s + browser collaborators seam + `createCapabilities` / `createMcpCapabilities`. |
| `register.ts` | `registerWebMcpCapabilities` (all 7) and `registerMcpCapabilities` (MCP subset) + `CAPABILITY_NAMES`. |
| `index.ts` | Public barrel. |
| `capabilities.test.ts` | Tests through the real `CapabilityRegistry.invoke` pipeline via a fake transport. |

## Catalogue

| Capability | Kind | Confirm | Scopes | Maps to | WebMCP | MCP |
| ---------- | ---- | :-----: | ------ | ------- | :----: | :-: |
| `find_courses` | READ | no | `courses:read` | `GET /api/courses` → `courseService.search` | ✅ | ✅ |
| `get_course_details` | READ | no | `courses:read` | `GET /api/courses/:id` → `courseService.getById` | ✅ | ✅ |
| `compare_courses` | READ | no | `courses:read` | **composed** over `get_course_details` (no endpoint, D1) | ✅ | ✅ |
| `navigate_to_course` | NAVIGATION | no | `navigation:course` | injected browser navigate collaborator | ✅ | ❌ (D2) |
| `prepare_enquiry` | READ | no | `enquiry:read` | pure draft shaping (may read course title) | ✅ | ✅ |
| `validate_enquiry` | READ | no | `enquiry:read` | reuse enquiry candidate schema (advisory) | ✅ | ✅ |
| `submit_enquiry` | WRITE | **yes** | `enquiry:write` | `POST /api/enquiries` → `enquiryService.submit` | ✅ | ✅ |

- **`submit_enquiry` is the only WRITE** and requires explicit human confirmation —
  the registry calls `ctx.confirm(...)` before `execute`; a decline throws
  `ConfirmationDeniedError` and nothing is submitted.
- **`navigate_to_course` is WebMCP-only** (a headless MCP client has no browser
  location), so the MCP subset excludes it.
- **`validate_enquiry` never throws** on a bad candidate: its registry-level input
  schema is permissive and the strict check runs inside `execute`, returning
  `{ valid, fieldErrors }` so an agent can guide correction.

## Usage

```ts
import { CapabilityRegistry } from '@/lib/webmcp';
import { registerWebMcpCapabilities } from '@/agent/capabilities';

const registry = new CapabilityRegistry();
registerWebMcpCapabilities(registry, {
  navigateToCourse: (id) => router.push(courseDetailsHref(id)),
});

// Invoke through the shared pipeline: validate → confirm → execute → validate.
const result = await registry.invoke('find_courses', { keyword: 'cloud' }, {
  transport,          // createBrowserTransport({ baseUrl }) or a fake in tests
  confirm,            // ConfirmationRequester (Spec 10/11)
});
```

## Testing

Tests swap a **fake `CapabilityTransport`** (the sanctioned seam — no global
`fetch` mocking, no network) and assert schema validation
(`CapabilityValidationError`), write confirmation
(`ConfirmationDeniedError` on decline), composition, and the MCP subset. See
`capabilities.test.ts`.

## Boundaries

- No business logic, no new endpoints, no Course/Enquiry model changes.
- The backend remains the trust boundary and re-validates every write regardless
  of the agent-side schema (Spec 10 / `security.md`).
