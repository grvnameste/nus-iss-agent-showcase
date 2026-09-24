# Services

**Business logic lives here.** Services are transport-agnostic (no Express, no
React) so the same capability can be reused by the human website (via the REST
API) and, later, by agent tools (via the Agent Capability Layer / WebMCP) —
without duplication (AR-001, AR-002).

Empty in Specification 01. The Course Service arrives in Specification 02.

Layering: Routes → Controllers → **Services** → Repositories → Data.
