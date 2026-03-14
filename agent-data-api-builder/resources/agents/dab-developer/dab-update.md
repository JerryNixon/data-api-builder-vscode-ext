# `dab update` Reference

## Purpose

Update an existing entity configuration.

## Common operations

### Add/replace role permissions

`dab update Product --permissions "admin:*"`

### Add mapping

`dab update Product --map "ProductName:name,UnitPrice:price"`

### Add relationship

`dab update Product --relationship category --cardinality one --target.entity Category --source.fields "CategoryId" --target.fields "CategoryId"`

### Enable MCP custom tool

`dab update SearchProducts --mcp.custom-tool true`

## Rules

- Relationship fields must map real key/FK pairs.
- Use OData-style policy syntax (`@item...`, `@claims...`).

## Related docs

- [relationships.md](relationships.md)
- [mcp.md](mcp.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-update
