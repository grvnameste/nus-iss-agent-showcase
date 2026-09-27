# Specification 14 — Agent Demo UI & Interaction Experience · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 14-agent-demo
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; WebMCP `../11-webmcp-integration/`;
orchestration `../13-agent-integration/`; design system `.kiro/steering/design.md`.

> Descriptive/advisory only. No code is written by this spec.

---

## 1. Design goals

- **DG1** Make the agent journey **transparent** (visible tool calls, inspectable
  I/O, clear status).
- **DG2** Keep the human **in control** (explicit approval; the site stays usable).
- **DG3** Reuse the Phase 1 design system and a11y — no new visual language.

## 2. Placement & mounting (D5)

```
client/src/agent/
  ├─ demo/
  │   ├─ AgentPanel.tsx        # 'use client' — the dockable panel
  │   ├─ Transcript.tsx        # ordered messages + tool calls
  │   ├─ ToolCallCard.tsx      # status + expandable I/O
  │   └─ ConfirmationDialog    # reuse Spec 11 confirmation
  └─ (orchestrator/planner from Spec 13)
```

- Mounted behind a toggle via the existing providers or a dedicated route (e.g.
  `/agent-demo`), so nothing changes on the normal pages when hidden (FR-1401).

## 3. Panel layout

- A side/docked panel (responsive: full-width sheet on mobile) using the design
  system: `Card` surfaces, slate/sky palette, `buttonClasses` for actions,
  `space-y-*` rhythm.
- Regions: **request input** (top or bottom), **transcript** (scrolling), and a
  **result/confirmation** area.

## 4. Transcript & tool-call cards (FR-1402, FR-1403, FR-1404)

- Transcript renders user/agent messages and, inline, a **ToolCallCard** per
  capability invocation:
  - Header: capability name + kind badge (READ/NAVIGATION/WRITE), reusing the
    `AvailabilityBadge` pattern (label + shape, not colour-only).
  - **Status:** pending (spinner + text), success (✓ + text), error (✕ + text) —
    text-labelled, `aria-live="polite"` announcements, no focus theft.
  - **Expandable I/O:** collapsed by default; expanding shows validated input and
    output. PII fields are shown for human review but never persisted/logged
    (§7).

## 5. Human approval (FR-1405)

- For `submit_enquiry`, the Spec 11 `ConfirmationRequester` dialog is presented
  (accessible modal: labelled, focus-trapped, Escape/Cancel = decline, focus
  returned). Summary lists the course + fields being sent.
- Approve → orchestrator proceeds; Decline/Cancel → cancelled state, no submission.

## 6. Result & error states (FR-1406)

| State | Rendering |
| ----- | --------- |
| Success | Confirmation card: reference, course title, status, timestamp |
| Validation error | Inline message + which fields (from `validate_enquiry`/error) |
| Declined/cancelled | Neutral "cancelled — nothing was submitted" note |
| Backend error | Sanitised "couldn't complete" message; retry affordance for READs only |
| Duplicate | "Already submitted — reference …" (Spec 10) |

## 7. PII handling (FR-1404.2, Spec 10)

- The UI may display enquiry values for human review; it **does not** persist
  transcripts and **does not** log PII. Any demo logging uses the PII-free audit
  shape (capability/kind/outcome).

## 8. Accessibility (FR-1407, design.md §8)

- One H1 for the demo route; sections labelled; keyboard operable; visible focus
  rings; `aria-live` for status; dialog focus management. Colour never the only cue
  (kind/status carry text + glyph).

## 9. Coexistence & non-regression (FR-1401)

- Additive only: a provider/route + a toggle. Existing pages/components/tests are
  untouched. With the panel hidden, the app is byte-for-byte the Phase 1 site.

## 10. Testing approach (testing.md; Spec 15 target)

- Component tests: request submit renders transcript; tool-call cards reflect the
  Spec 11 status signal; approve/decline drives submit/cancel; success/error/
  duplicate states render; dialog a11y (focus, Escape). Drive with the **scripted
  planner** + fake capability client for determinism (no network/LLM).

## 11. Constraints recap

Spec 14 only; specification-only; no code. Additive panel; site always usable;
reuse Spec 11 confirmation + Spec 13 orchestration + Phase 1 design system/a11y; no
PII persistence/logging; write requires approval. Synthetic data only; RP
inspiration only. Do not create Spec 16.
