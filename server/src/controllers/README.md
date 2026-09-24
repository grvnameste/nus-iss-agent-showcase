# Controllers

HTTP boundary layer. Controllers translate HTTP requests into calls on
**Services** and shape responses/errors. They own request/response concerns and
input validation (via `src/http/validate.ts`) — **not** business logic.

Empty in Specification 01 (the health route needs no controller). The Course
Controller arrives in Specification 02.

Layering: Routes → **Controllers** → Services → Repositories → Data.
