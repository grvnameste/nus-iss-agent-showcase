# EduAgent Connect — MCP Server (Spec 12)

A standalone **Model Context Protocol** server that exposes the approved agent
capabilities to compatible MCP clients (e.g. Claude, IDE agents). It **reuses the
backend business services** — it does not duplicate business logic and does not
touch data directly.

## Design decisions (as implemented)

- **Service reuse — Option B (direct import).** The capability adapter imports the
  transport-agnostic `courseService` / `enquiryService` and the authoritative
  `enquiryInputSchema` directly from `server/src` (compiled together under this
  workspace's NodeNext tsconfig). No network hop; the server workspace is
  **unchanged** (read-only reuse).
- **MCP SDK pinned to `@modelcontextprotocol/sdk@1.30.1`** (exact version, v1 line)
  for mature client compatibility.
- **MCP capability set excludes `navigate_to_course`** (browser-only, Spec 09 D2).
  Six tools are exposed: `find_courses`, `get_course_details`, `compare_courses`,
  `prepare_enquiry`, `validate_enquiry`, `submit_enquiry`.

## Layout

```
mcp-server/src/
├── index.ts                     # process entrypoint (stdio transport + lifecycle)
├── server.ts                    # buildServer(): McpServer + adapter + tools
├── config/env.ts                # Zod-validated env (transport, log level)
├── tools/register-tools.ts      # advertises the 6 tools; routes to the adapter
└── adapters/
    ├── capability-adapter.ts    # maps tools → reused backend services (Option B)
    ├── schemas.ts               # reuses server enquiry schema (no third copy)
    ├── approval.ts              # human approval; FAIL-CLOSED by default
    ├── duplicate-guard.ts       # session-scoped duplicate-submission protection
    └── audit.ts                 # PII-free audit sink (stderr / in-memory)
```

## Guardrails (Spec 10)

- **Backend is the trust boundary:** `submit_enquiry` input is validated by the
  adapter and **re-validated authoritatively** by the reused `enquiryService`.
- **Human approval for writes, fail-closed:** `submit_enquiry` requires explicit
  approval via the wired `HumanApproval` channel. The default is `DenyingApproval`,
  so an unattended server **never** self-approves — the write is refused.
- **No speculative writes / duplicates:** an identical resubmission is blocked and
  the prior reference reported; no second record is created.
- **PII-free audit:** one metadata-only record per tool call (capability, kind,
  outcome, approval) — never enquiry values. Audit goes to **stderr** so it never
  corrupts the stdio protocol on stdout.

## Run

```bash
npm run dev --workspace mcp-server     # tsx (stdio)
npm run build --workspace mcp-server   # tsc → dist/
npm run start --workspace mcp-server   # node dist/index.js
```

Configure an MCP client to launch the built server over stdio. To actually allow
`submit_enquiry`, wire a `HumanApproval` implementation (e.g. MCP elicitation) in
`buildServer` — otherwise writes are refused by design.

## Notes

- A known dev-tooling advisory exists in `tsx`→`esbuild` (build-time only, not a
  runtime/production concern), consistent with the rest of the repo. The MCP SDK
  itself (`1.30.1`) reports no advisories.
- Type note: the SDK bundles its own Zod; tool `inputSchema` is passed as a Zod raw
  shape at runtime but registered through a type-decoupled facade so strict `tsc`
  does not unify the two Zod instances (which otherwise exhausts the type checker).
  The adapter re-validates all input regardless.

## Testing

`npm run test --workspace mcp-server` — deterministic unit tests with fake
services: READ shaping, fail-closed approval, duplicate blocking, PII-free audit,
sanitised errors, and that navigation is excluded from the tool set.
