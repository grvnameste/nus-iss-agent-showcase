# WebMCP Integration Layer (Spec 11)

Exposes the shared agent capabilities (Spec 09) to an in-browser AI agent through
**WebMCP**, enforcing the Spec 10 guardrails. It is **purely additive** and
**degrades gracefully**: with no WebMCP browser surface the human website is
completely unchanged.

## Files

| File | Purpose |
| ---- | ------- |
| `detect.ts` | Feature-detects the emerging browser WebMCP surface behind a typed guard; returns a handle or `null`. Never throws. |
| `status-store.ts` | PII-free observable of per-invocation status (`pending`/`success`/`error`) for the Spec 14 demo UI. Metadata only. |
| `webmcp-adapter.ts` | `initWebMcp(...)` — registers capabilities, advertises tools to a detected surface, and routes every call through `invokeWithGuardrails` (Spec 10). Graceful no-op when absent. |
| `confirm/confirmation-controller.ts` | Bridges the registry's async `ConfirmationRequester` to a rendered React dialog (resolves on approve/decline; one decision at a time). |
| `confirm/ConfirmationDialog.tsx` | Accessible modal (`role=dialog`, focus trap, Escape=decline, focus return) reusing the Phase 1 design system. Shows field **names** being sent, not values. |
| `use-safe-router.ts` | `useRouter()` that returns a no-op push instead of throwing outside an App Router context — keeps the provider from ever crashing the shell. |
| `AgentProvider.tsx` | `'use client'` provider mounted once via `AppProviders`: detect → init → host the confirmation dialog. Additive. |

## How it fits together

```
AppProviders → AgentProvider (mount once, client)
  └─ initWebMcp({ confirm, navigateToCourse, audit, duplicateGuard })
       ├─ registerWebMcpCapabilities(registry, …)        (Spec 09)
       ├─ detectWebMcp() → surface | null                (graceful fallback)
       └─ tool call → invokeWithGuardrails(registry, …)  (Spec 10)
                        └─ registry.invoke: validate → confirm → execute → validate
```

- **Detection & fallback (FR-1101):** no surface → no tools advertised, no errors,
  human UI untouched. Capabilities are still registered for potential in-app use.
- **Confirmation (FR-1104):** `submit_enquiry` triggers the dialog via the
  controller; approve → proceed, decline/Escape/backdrop → `ConfirmationDeniedError`,
  nothing submitted. READs never prompt.
- **Guardrails (Spec 10):** duplicate protection + PII-free audit apply uniformly.
- **Status (FR-1105.3):** the `StatusStore` records pending/success/error per
  invocation (no PII) for the demo UI to observe.

## Non-regression

Mounting is additive: `AgentProvider` wraps children and renders only an idle
confirmation host when nothing is pending. With no router context, navigation is a
no-op (never throws). Existing human journeys and tests are unaffected.

## Testing

`webmcp-adapter.test.ts` (registration, fallback no-op, guardrailed invocation,
status), `confirm/confirmation-controller.test.ts` (approve/decline/concurrent),
and `confirm/ConfirmationDialog.test.tsx` (a11y: dialog role, approve, decline,
Escape, initial focus). All deterministic via a fake transport + fake surface.
