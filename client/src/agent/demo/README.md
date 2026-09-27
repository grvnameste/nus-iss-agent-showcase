# Agent Demo UI (Spec 14)

A transparent, human-supervised demonstration of the agent completing the
reference course-enquiry journey over the site's WebMCP capabilities. It is
**purely additive**: a dedicated `/agent-demo` route hosts the panel; the human
website is unchanged everywhere else.

## Files

| File | Purpose |
| ---- | ------- |
| `AgentPanel.tsx` | `'use client'` panel: request input, runs orchestration (Spec 13) over the real WebMCP client (Spec 11) + guardrails (Spec 10), hosts the confirmation dialog. |
| `Transcript.tsx` | Ordered transcript: messages + `ToolCallCard`s + final result/declined/budget state. |
| `ToolCallCard.tsx` | One tool call: kind badge + status (text + glyph, not colour-only) + expandable input/output. |

Route: `client/src/app/agent-demo/page.tsx` (single H1, metadata, additive).

## What it demonstrates

- **Transparency (DG1):** every capability call is shown with its kind, status,
  and inspectable input/output.
- **Human in control (DG2):** the `submit_enquiry` step raises the Spec 11
  confirmation dialog; approve proceeds, decline/cancel yields a "nothing was
  submitted" state.
- **Reuse (DG3):** the Phase 1 design system (`Card`, `buttonClasses`, slate/sky,
  badge pattern) and the Spec 11/13 machinery — no new visual language, no new
  business logic.

## Determinism & injection seam

`AgentPanel` accepts optional `client` / `kindOf` / `journey` props. Production
omits them and builds the real WebMCP-backed client (registry + guardrails +
browser transport) and resolves the journey from a live catalogue search. Tests
inject a fake client + fixed journey for deterministic, network-free runs.

## PII

Enquiry values may be displayed for human review, but the demo **does not persist
transcripts and does not log PII**. Audit (via the guardrails layer) is metadata
only (capability / kind / outcome).

## Accessibility

One H1 on the route; labelled sections; keyboard-operable controls with visible
focus; `aria-live="polite"` status on tool cards; the confirmation dialog is
focus-managed (Spec 11). Kind and status never rely on colour alone.

## Testing

`ToolCallCard.test.tsx`, `Transcript.test.tsx`, `AgentPanel.test.tsx` — component
tests driven by a fake capability client and a fixed scripted journey: transcript
ordering, tool-card states + expandable I/O, approve → submission confirmation,
decline → cancelled state.
