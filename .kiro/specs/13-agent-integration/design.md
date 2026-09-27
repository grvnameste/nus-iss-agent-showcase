# Specification 13 — AI Agent Integration & Orchestration · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 13-agent-integration
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; capability model
`../09-agent-capability-model/`; guardrails `../10-agent-guardrails/`; interfaces
`../11-webmcp-integration/`, `../12-mcp-server/`.

> Descriptive/advisory only. No code is written by this spec.

---

## 1. Design goals

- **DG1** One orchestration that runs over either interface (WebMCP or MCP).
- **DG2** Agent selects/sequences tools; **no business logic** in the agent.
- **DG3** Guardrails hold across the whole journey (no speculative writes; explicit
  confirmation; clean cancellation).

## 2. Layered view

```
User intent
   ▼
Agent orchestrator (client/src/agent/orchestrator)
   ├─ model provider (behind an interface: LLM or scripted/deterministic)
   ├─ capability client (transport-agnostic facade)
   │     ├─ WebMCP binding (Spec 11)  → includes navigate_to_course
   │     └─ MCP binding (Spec 12)     → excludes navigate_to_course
   ▼
Declared capabilities → services (business logic) → data
```

## 3. Capability client (transport-agnostic) (FR-1302)

- A single facade exposes `list()` and `invoke(name, input)` and hides whether the
  underlying interface is WebMCP or MCP.
- `list()` returns the capabilities the active interface advertises; the
  orchestrator plans only over what's present (so MCP simply lacks
  `navigate_to_course`).
- `invoke()` routes to the interface, which runs the shared
  `CapabilityRegistry.invoke` pipeline (validate → confirm → execute → validate).

## 4. Model-provider seam (FR-1306.2)

- The "brain" is behind a `Planner`/provider interface. Two implementations:
  - **LLM planner** — turns user intent + tool schemas into tool calls (real demo).
  - **Scripted planner** — deterministic sequence for the reference journey (tests
    & offline demo; supports Spec 15 determinism, no network).
- The orchestrator is identical regardless of planner; only the planner differs.

## 5. Orchestration loop (FR-1301, FR-1303)

```
1. discover: capabilities = client.list()
2. loop (bounded):
   a. planner proposes next action (a capability call, a message, or "done")
   b. if capability call:
        - validate against schema (interface does this)
        - if requiresHumanConfirmation → interface obtains human decision
            · declined → stop (report cancellation)
        - invoke; capture result or sanitized error
   c. feed result back to planner
3. synthesize: present factual results; user chooses course; report reference
```

- The loop is **bounded** (max steps) to avoid runaway sequences.
- The user chooses which course to enquire about (FR-1303.2): the planner presents
  options; it does not auto-pick.

## 6. Journey mapping (FR-1303, §6 of requirements)

find → details → compare → (navigate if WebMCP) → prepare → validate → **confirm**
→ submit → reference. `prepare_enquiry`/`validate_enquiry` (READs) shape and check
the draft; only the confirmed `submit_enquiry` writes.

## 7. Guardrail adherence (FR-1304, Spec 10)

- No path calls `submit_enquiry` without a prior confirmed human decision in the
  same journey.
- A `ConfirmationDeniedError` ends the journey gracefully (no retry-around).
- The agent never calls the backend directly or fabricates a capability.

## 8. Errors, recovery & cancellation (FR-1305)

| Condition | Orchestrator behaviour |
| --------- | ---------------------- |
| Input invalid (`CapabilityValidationError`) | surface; planner may re-`validate_enquiry` / fix, or stop |
| READ backend error | may retry once, then report sanitised |
| WRITE error | report sanitised; **no silent retry** |
| Duplicate submit (Spec 10) | report existing reference; no second record |
| User cancels | stop; no partial submit |

## 9. State & separation (FR-1306)

- Turn/plan state lives in the orchestrator, separate from domain state and
  services. No catalogue/enquiry rules are duplicated here.
- Placement: `client/src/agent/orchestrator/` + `client/src/agent/planner/`
  (LLM + scripted), reusing the Spec 11 capability client.

## 10. Testing approach (testing.md; Spec 15 target)

- Drive the orchestrator with the **scripted planner** + a **fake capability
  client** to assert the exact journey, no-speculative-write, decline-stops,
  duplicate-prevented, and transport-difference (MCP skips navigation) behaviours —
  deterministically, no network/LLM.

## 11. Constraints recap

Spec 13 only; specification-only; no code. Orchestration separate from business
logic; transport-agnostic; planner behind an interface; guardrails enforced; user
chooses the course. Reuse Spec 09 contract + Spec 10/11/12. Synthetic data only;
RP inspiration only. Do not create Spec 16.
