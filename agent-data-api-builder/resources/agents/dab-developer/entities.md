# Entities Reference

## Purpose

Define how database objects are exposed as API entities.

## Core structure

- `source`: table/view/stored-procedure mapping
- `permissions`: role/action rules
- `mappings`: API field renames
- `relationships`: GraphQL navigation
- `rest` / `graphql` / `mcp`: per-entity endpoint behavior

## Guardrails

- Views require key fields.
- Stored procedures should use `execute` action.
- Keep permissions least-privilege.
- Use stable, business-oriented entity names.

## Related docs

- [runtime.md](runtime.md)
- [relationships.md](relationships.md)
- [dab-add.md](dab-add.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/configuration/entities
