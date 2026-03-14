# Relationships Reference

## Purpose

Define GraphQL navigation between entities.

## Supported patterns

- One-to-many
- Many-to-one
- Many-to-many (with linking table)
- Self-referencing

## Rules

- Use correct field direction (`source.fields` from current entity).
- For many-to-many, provide `linking.object` and linking field mappings.
- Relationship names should be semantic (`orders`, `customer`, `manager`).

## Related docs

- [entities.md](entities.md)
- [dab-update.md](dab-update.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/configuration/entities/relationships
