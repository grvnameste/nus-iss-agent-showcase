# Agent Orchestration (Spec 13)

Connects an AI agent to the exposed capabilities and sequences them into the
end-to-end learner journey. Orchestration is **separate from business logic** (that
lives in the backend services) and **separate from the model provider** (behind the
planner seam), so the same loop runs with a live LLM or a deterministic script.

## Files

| File | Purpose |
| ---- | ------- |
| `capability-client.ts` | `CapabilityClient` facade (`list()` / `invoke()`) — transport-agnostic over WebMCP or a fake. |
| `webmcp-capability-client.ts` | Adapts the Spec 11 `WebMcpHandle` (already guardrailed) to the facade. |
| `planner.ts` | `Planner` seam — proposes one action per turn (`call` / `message` / `done`). No execution, no business logic. |
| `scripted-planner.ts` | Deterministic planner that drives the reference journey; skips `navigate_to_course` when unavailable (MCP subset). |
| `orchestrator.ts` | `runOrchestration(...)` — bounded plan→invoke loop; enforces guardrail behaviour. |

## Reference journey (FR-1303)

`find_courses` → `get_course_details` → `compare_courses` →
`navigate_to_course` (WebMCP only) → `prepare_enquiry` → `validate_enquiry` →
**human confirmation** → `submit_enquiry` → confirmation reference.

The user chooses which course to enquire about; the agent presents options and
prepares the draft but does not autonomously pick (FR-1303.2).

## Guardrail behaviour (FR-1304, FR-1305)

- **No speculative writes:** a WRITE happens only when the planner explicitly calls
  `submit_enquiry`; the client's pipeline requests human confirmation before it
  executes.
- **Declined confirmation stops cleanly:** `ConfirmationDeniedError` ends the run;
  the orchestrator never retries a WRITE.
- **Bounded loop:** a step budget (`maxSteps`, default 12) prevents runaway
  sequences.
- **Sanitised errors:** non-fatal capability errors are recorded as sanitised step
  errors (no internals) and the planner may adjust or finish.

## Transport-agnostic (FR-1302)

The orchestrator plans only over what `client.list()` advertises. Over an interface
that lacks a capability (e.g. MCP has no `navigate_to_course`), the journey adapts
by skipping it rather than failing.

## Note on interfaces

This in-app orchestrator drives the **browser/WebMCP** experience. The MCP server
(Spec 12) is driven by **external** MCP clients, which supply their own
orchestration; the capability contract and guardrails are shared, but the in-app
loop here is the WebMCP path (Spec 14 builds the demo UI on top of it).

## Testing

`orchestrator.test.ts` uses the scripted planner + a fake `CapabilityClient` to
assert the full journey (WebMCP and MCP-subset), no-speculative-writes,
decline-stops-cleanly, the bounded budget, and sanitised error handling — all
deterministic, no network/LLM.
