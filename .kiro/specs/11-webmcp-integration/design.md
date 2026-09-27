# Specification 11 — WebMCP Integration Layer · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 11-webmcp-integration
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; capability model
`../09-agent-capability-model/`; guardrails `../10-agent-guardrails/`; existing
layer `client/src/lib/webmcp/`.

> Descriptive/advisory only. No code is written by this spec. Snippets are
> illustrative for the future implementation spec-task.

---

## 1. Design goals

- **DG1** Expose Spec 09 capabilities in the browser by **registering them against
  the existing registry** and binding to the WebMCP surface via a thin adapter.
- **DG2** Degrade gracefully: no WebMCP → normal human website, no errors.
- **DG3** Enforce Spec 10 guardrails, especially human confirmation for
  `submit_enquiry`.

## 2. Placement (D5)

```
client/src/lib/webmcp/     # EXISTING contract + registry + transport (reused)
client/src/agent/          # NEW (when implemented):
  ├─ capabilities/         #   Spec 09 capability definitions (register here)
  ├─ webmcp-adapter.ts     #   detect + bind registry ↔ browser WebMCP surface
  ├─ confirm/              #   ConfirmationRequester + accessible dialog
  └─ agent-provider.tsx    #   mounts detection + registration (client component)
```

The layer is mounted once (e.g. via the existing `AppProviders`) so it initialises
on the client without touching page components.

## 3. Detection & fallback (FR-1101)

- A `detectWebMcp()` helper feature-detects the browser WebMCP surface (e.g. a
  `navigator`-scoped API) behind a typed guard, returning a capability handle or
  `null`. Because the exact browser binding is emerging, detection is isolated in
  one module so the binding can change without touching capabilities.
- If `null`: skip registration entirely; the human UI is untouched. No throw, no
  console noise, no changed markup.

## 4. Registration & schemas (FR-1102)

- Capability definitions live in `client/src/agent/capabilities/` as
  `CapabilityDefinition`s (Spec 09 shape), each importing its Zod input/output
  schemas (reusing the client course/enquiry schemas which mirror the server).
- On successful detection, the adapter registers each WebMCP-applicable capability
  with the shared `capabilityRegistry` and advertises it to the browser WebMCP
  surface using the same name/description/schema (one source of truth).

## 5. Execution & mapping (FR-1103)

- The WebMCP surface calls a tool → the adapter routes to
  `capabilityRegistry.invoke(name, input, ctx)` with a `ctx` carrying:
  - `transport = createBrowserTransport({ baseUrl: resolveApiBaseUrl() })`
  - `confirm = <the ConfirmationRequester from §6>`
- Mapping by kind:
  - **READ** (`find_courses`, `get_course_details`, `validate_enquiry`,
    `prepare_enquiry`) → `transport.read`/pure shaping.
  - **compose** (`compare_courses`) → invoke `get_course_details` per id, shape the
    comparison result (cap 4).
  - **NAVIGATION** (`navigate_to_course`) → client router push to the course route;
    returns `{ href }`.
  - **WRITE** (`submit_enquiry`) → confirmation → `transport.write` →
    `POST /api/enquiries`.
- No business rules are re-implemented; services remain authoritative.

## 6. Confirmation UI (FR-1104, Spec 10)

- `ConfirmationRequester` implementation renders an **accessible modal dialog**:
  - Role `dialog`, labelled, focus trapped, Escape/Cancel = decline, returns focus.
  - Shows a **summary** (course title, enquiry type, "your name/email/phone/message
    will be sent") — field names only, values shown to the human for review but
    **never logged**.
  - Approve → resolves `true`; Decline/Cancel/close → resolves `false` →
    `ConfirmationDeniedError`.
- Reuses the Phase 1 design system (`design.md`: `buttonClasses`, focus rings,
  slate/sky palette).

## 7. Results, status & errors (FR-1105)

- Results returned in the validated output shape.
- A small, PII-free **status store** (pending/success/error per invocation) is
  exposed for the Spec 14 demo UI to observe; Spec 11 defines the shape but does
  not build the panel.
- Errors: `CapabilityValidationError` / `ConfirmationDeniedError` / sanitised
  transport errors. No internals surface.

## 8. Non-regression & accessibility (FR-1106)

- Mounting is additive (provider only); existing pages/tests unaffected.
- The dialog meets the Phase 1 a11y bar (one concern at a time, keyboard operable,
  `aria` wiring), consistent with steering `design.md` §8.

## 9. Testing approach (testing.md)

- Register capabilities against a **fake `CapabilityTransport`** (no network) and
  assert: schema validation triggers `CapabilityValidationError`; a declined
  confirmation aborts `submit_enquiry` with `ConfirmationDeniedError`; READs need
  no confirmation; `compare_courses` composes; detection-absent path is a no-op.
- Component-test the confirmation dialog (open, approve, decline, focus, Escape).
- These are the Spec 15 targets; Spec 11 only specifies them.

## 10. Constraints recap

Spec 11 only; specification-only; no code. Reuse `client/src/lib/webmcp/` and the
Spec 09 contract; new code (later) under `client/src/agent/`. Detect WebMCP with
graceful fallback; confirmation required for `submit_enquiry`; no duplicated logic;
no new endpoints/model changes. Synthetic data only; RP inspiration only. Do not
create Spec 16.
