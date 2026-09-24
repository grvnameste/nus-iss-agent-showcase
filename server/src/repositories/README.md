# Repositories

Data-access layer. Repositories are the **only** components that know the data
source, exposing typed access to Services. They contain no business rules, so the
synthetic-data source can later be swapped (e.g. for a database) without changing
Services.

Empty in Specification 01. The Course Repository arrives in Specification 02.

Layering: Routes → Controllers → Services → **Repositories** → Data.
