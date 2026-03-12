# Multi-file configuration rules

For split configurations:

- Top-level config holds effective `runtime` and `data-source-files`.
- Each child config must include `data-source` and `entities`.
- Entity names must be globally unique across child files.
- Relationships cannot target entities defined in other child files.

## Practical workflow

1. Keep runtime/auth/CORS decisions in top-level config.
2. Group entities by data source in child files.
3. Validate each child file and then validate the top-level config.
4. Resolve naming collisions before runtime start.
