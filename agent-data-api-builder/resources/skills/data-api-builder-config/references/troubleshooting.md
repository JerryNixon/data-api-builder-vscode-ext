# Troubleshooting syntax and startup issues

## Policy expression syntax

```json
// WRONG (SQL-style)
"policy": { "database": "Status = 'Active'" }

// CORRECT (OData-style)
"policy": { "database": "@item.Status eq 'Active'" }
```

## View key fields

```json
// WRONG
"source": { "object": "dbo.vw_ProductSummary", "type": "view" }

// CORRECT
"source": { "object": "dbo.vw_ProductSummary", "type": "view", "key-fields": ["ProductId"] }
```

## Stored procedure permissions

```json
// WRONG
"permissions": [{ "role": "authenticated", "actions": ["read"] }]

// CORRECT
"permissions": [{ "role": "authenticated", "actions": ["execute"] }]
```

## Common runtime failures

- Auto-config generated none: verify include/exclude scope and PK eligibility.
- Auto-config collisions: change naming pattern (for example `{schema}_{object}`).
- Unresolved env vars: confirm every `@env('...')` variable exists before start.
