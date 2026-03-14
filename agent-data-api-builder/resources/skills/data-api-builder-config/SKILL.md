---
name: data-api-builder-config
description: Create and refine dab-config.json directly, including data-source, runtime, entities, permissions, and relationships.
license: MIT
---

# Data API Builder Config

## Use when

- You are editing `dab-config.json` directly.
- You need precise JSON-level control over runtime and entities.

## Workflow

1. Start from minimal valid config.
2. Add runtime blocks intentionally.
3. Add entities with explicit permissions.
4. Validate and iterate.

## Guardrails

- Keep one clear config source of truth.
- Prefer least-privilege permissions.
- Avoid hardcoded secrets in config.

## Related skills

- `data-api-builder-cli`
- `data-api-builder-auth`
- `data-api-builder-mcp`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/configuration/
