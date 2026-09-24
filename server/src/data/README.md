# Data

Synthetic data location. Later specifications place fictional JSON fixtures here
(e.g. synthetic courses). **All data is synthetic** — no Republic Polytechnic
production data, and no external integration.

Specification 02 adds the synthetic course dataset (`courses.json`) and a
validating loader (`course-data.ts`) that fails fast on invalid records.

Layering: Routes → Controllers → Services → Repositories → **Data**.
