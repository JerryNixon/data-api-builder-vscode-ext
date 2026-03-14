# `dab add` Reference

## Purpose

Add an entity (table, view, or stored procedure) to `dab-config.json`.

## Canonical examples

### Table

`dab add Product --source dbo.Products --permissions "anonymous:read"`

### View

`dab add ProductSummary --source dbo.vw_ProductSummary --source.type view --source.key-fields "ProductId" --permissions "anonymous:read"`

### Stored procedure

`dab add GetProducts --source dbo.usp_GetProducts --source.type stored-procedure --permissions "authenticated:execute"`

## Rules

- Views require `--source.key-fields`.
- Stored procedures require `execute` permission.
- Keep entity names API-friendly and stable.

## Related docs

- [entities.md](entities.md)
- [relationships.md](relationships.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-add
