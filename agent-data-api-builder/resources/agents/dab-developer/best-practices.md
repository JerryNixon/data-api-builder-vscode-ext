# DAB Best Practices (Condensed)

## Connection Strings

Always use environment variable references:
```json
{ "connection-string": "@env('DATABASE_CONNECTION_STRING')" }
```

## Entity Design

**Tables** - Full CRUD:
```bash
dab add Product --source dbo.Products --permissions "authenticated:create,read,update,delete"
```

**Views** - Read-only (must specify key-fields):
```bash
dab add ProductSummary --source dbo.vw_ProductSummary --source.type view --source.key-fields "ProductId" --permissions "authenticated:read"
```

**Stored Procedures**:
```bash
dab add CalculateRevenue --source dbo.usp_CalculateRevenue --source.type stored-procedure --permissions "admin:execute"
```

## Clean API Names

Map database names to clean API names:
```bash
dab add User --source dbo.tbl_usr --map "usr_id:id,usr_nm:name"
```

## Exclude Sensitive Fields

```bash
dab add User --source dbo.Users --fields.exclude "PasswordHash,SecurityStamp"
```

## Permissions

**Principle of least privilege:**
```bash
dab add Product --permissions "anonymous:read"
dab update Product --permissions "authenticated:update"
dab update Product --permissions "admin:*"
```

**Row-level security (database policy):**
```bash
dab add Order --permissions "authenticated:read" --policy-database "@item.UserId eq @claims.userId"
```

## Caching

```bash
# Development (short TTL)
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 5

# Production (longer TTL)
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 300
```

## Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| Host mode | `development` | `production` |
| Auth provider | `Simulator` | `AzureAd` |
| CORS | `http://localhost:*` | `https://myapp.com` |
| Cache TTL | 5 seconds | 300 seconds |
| GraphQL introspection | enabled | disabled |

## Relationships

**One-to-many (Category → Products):**
```bash
dab update Category --relationship "products" --cardinality many --target.entity Product --source.fields "CategoryId" --target.fields "CategoryId"
```

**Many-to-one (Product → Category):**
```bash
dab update Product --relationship "category" --cardinality one --target.entity Category --source.fields "CategoryId" --target.fields "CategoryId"
```

## Naming Conventions

- **Entities**: PascalCase, singular (`Product`, `OrderLine`)
- **Fields**: camelCase (`productId`, `firstName`)
- **Relationships**: plural for many (`products`), singular for one (`category`)

## Azure Cost Optimization

| Resource | Dev SKU | ~Monthly Cost |
|----------|---------|---------------|
| ACR | Basic | $5 |
| Azure SQL | Basic (5 DTU) | $5 |
| Container Apps | Consumption | Pay-per-use (scales to zero) |

**Always clean up:**
```bash
az group delete --name <resource-group> --yes --no-wait
```

## Minimum Checks

```bash
dab validate                       # Always run before deploy
curl http://localhost:5000/health  # Must return healthy
```

## Post-deploy Verification (Standard)

- Hit REST/GraphQL after deploy and report results to the user (build confidence).
- Check health: `curl http://localhost:5000/health` (expect healthy).
- Check a representative entity list/count: `curl http://localhost:5000/api/<entity> | jq '.value | length'`.
- If schema enables writes, do a lightweight create/read/delete (or use a sample-data row) and report success.
