# Data API Builder Config Samples

These samples are intentionally small and focused so they can be copied into real projects.

## Files

- `minimal.dab-config.json`  
  Baseline runtime + data source + empty entities.

- `auto-config.dab-config.json`  
  Demonstrates runtime `autoentities` configuration (auto-config terminology in CLI/docs).
  Relies on DAB built-in auto-excluded object behavior by default.
  Generated entities are materialized when DAB starts (`dab start`).

- `relationships.dab-config.json`  
  Demonstrates one-to-many, many-to-one, and many-to-many (linking object) patterns.

- `multi-config/top-level.dab-config.json`  
  Top-level file using `data-source-files` and effective `runtime`.

- `multi-config/dab-config-sql.json`  
  MSSQL child config with entities.

- `multi-config/dab-config-cosmos.json`  
  Cosmos NoSQL child config with entities.

## Usage guidance

- For multi-config, relationships must stay inside a single child file.
- Child files must include both `data-source` and `entities`.
- Top-level runtime controls endpoint behavior for the whole app.
- Add `$schema` in your project if your editor trusts remote schemas.
- Add `patterns.exclude` only for project-specific exclusions beyond DAB built-in auto-excludes.
