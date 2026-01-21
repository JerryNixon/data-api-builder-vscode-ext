# DAB Best Practices

## Configuration Best Practices

### Use Environment Variables for Secrets

**❌ Don't**: Store connection strings directly in config
```json
{
  "connection-string": "Server=localhost;Database=MyDb;User=sa;Password=MyP@ssw0rd"
}
```

**✅ Do**: Use environment variable references
```json
{
  "connection-string": "@env('DATABASE_CONNECTION_STRING')"
}
```

**Benefits**:
- Keeps secrets out of version control
- Enables different connections per environment
- Follows 12-factor app principles

---

### Start with Safe Defaults

**Development Configuration**:
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development \
  --auth.provider Simulator \
  --rest.enabled true \
  --graphql.enabled true \
  --mcp.enabled true \
  --cache.enabled true \
  --cache.ttl-seconds 5
```

**Production Configuration**:
```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode production \
  --auth.provider AzureAd \
  --rest.enabled true \
  --graphql.enabled false \
  --mcp.enabled false \
  --cache.enabled true \
  --cache.ttl-seconds 300
```

---

### Version Control Your Configuration

**.gitignore**:
```
# Exclude sensitive files
.env
local.settings.json
appsettings.Development.json

# Optionally exclude config if it contains sensitive data
# dab-config.json
```

**Include in Repository**:
- ✅ `dab-config.json` (if using environment variables)
- ✅ `dab-config.template.json` (example configuration)
- ✅ `.env.example` (template for environment variables)
- ❌ `.env` (contains actual secrets except for developer environment where it is okay, just be sure and ignore in .gitignore)
- ❌ `local.settings.json` (contains actual secrets)

---

## Entity Design Best Practices

### Choose the Right Entity Type

**Tables** - For full CRUD operations:
```bash
dab add Product \
  --source dbo.Products \
  --permissions "authenticated:create,read,update,delete"
```

**Views** - For read-only or computed data:
```bash
dab add ProductSummary \
  --source dbo.vw_ProductSummary \
  --source.type view \
  --source.key-fields "ProductId" \
  --permissions "authenticated:read"
```

**Stored Procedures** - For complex business logic:
```bash
dab add CalculateRevenue \
  --source dbo.usp_CalculateRevenue \
  --source.type stored-procedure \
  --permissions "admin:execute"
```

---

### Use Descriptive Entity Names

**❌ Don't**: Use database names directly
```bash
dab add tbl_usr --source dbo.tbl_usr
```

**✅ Do**: Use meaningful API names
```bash
dab add User --source dbo.tbl_usr
```

**Benefits**:
- Clean API endpoints: `/api/User` vs `/api/tbl_usr`
- Better GraphQL schema
- Decouples API from database naming

---

### Exclude Sensitive Fields

**❌ Don't**: Expose all fields
```bash
dab add User --source dbo.Users --permissions "anonymous:read"
```

**✅ Do**: Explicitly exclude sensitive fields
```bash
dab add User \
  --source dbo.Users \
  --permissions "authenticated:read" \
  --fields.exclude "PasswordHash,SecurityStamp,TwoFactorSecret"
```

---

### Use Field Mappings for Better APIs

**❌ Don't**: Expose database field names
```bash
dab add Product --source dbo.Products
# Results in: { "prod_id": 1, "prod_nm": "Widget" }
```

**✅ Do**: Map to clean API names
```bash
dab add Product \
  --source dbo.Products \
  --map "prod_id:id,prod_nm:name,cat_id:categoryId"
# Results in: { "id": 1, "name": "Widget", "categoryId": 5 }
```

---

## Permission Best Practices

### Apply Principle of Least Privilege

**❌ Don't**: Give blanket permissions
```bash
dab add User --permissions "anonymous:*"
```

**✅ Do**: Grant specific permissions
```bash
# Public read access only
dab add Product --permissions "anonymous:read"

# Authenticated users can modify their own data
dab add User \
  --permissions "authenticated:read,update" \
  --policy-database "@item.UserId eq @claims.userId"
```

---

### Use Multiple Roles Appropriately

```bash
# Add entity with anonymous read
dab add Product --permissions "anonymous:read"

# Allow authenticated users to update
dab update Product --permissions "authenticated:update"

# Allow admins full access
dab update Product --permissions "admin:*"
```

**Resulting Configuration**:
```json
{
  "permissions": [
    {
      "role": "anonymous",
      "actions": ["read"]
    },
    {
      "role": "authenticated",
      "actions": ["update"]
    },
    {
      "role": "admin",
      "actions": ["*"]
    }
  ]
}
```

---

### Use Database Policies for Row-Level Security

**Scenario**: Users can only see their own orders.

```bash
dab add Order \
  --source dbo.Orders \
  --permissions "authenticated:read,create,update" \
  --policy-database "@item.UserId eq @claims.userId"
```

**Generated WHERE clause**:
```sql
WHERE UserId = @userId  -- from JWT claims
```

---

## Performance Best Practices

### Enable Caching

**Development** (short TTL for quick testing):
```bash
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 5
```

**Production** (longer TTL for performance):
```bash
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 300
```

**Cache Considerations**:
- ✅ Cache read-heavy entities
- ✅ Use longer TTL for static reference data
- ❌ Don't cache frequently changing data
- ❌ Don't cache user-specific data with global cache

---

### Use Pagination

**Client-side**:
```bash
# Limit results to avoid large responses
curl "http://localhost:5000/api/Product?\$top=20"

# Skip for pagination
curl "http://localhost:5000/api/Product?\$top=20&\$skip=20"
```

**Configuration**:
```bash
# Set default page size
dab configure --runtime.pagination.default-page-size 50

# Set maximum page size
dab configure --runtime.pagination.max-page-size 1000
```

---

### Optimize Database

**Create indexes** on frequently filtered/sorted columns:
```sql
-- Index for filtering
CREATE INDEX IX_Products_CategoryId ON dbo.Products(CategoryId);

-- Index for sorting
CREATE INDEX IX_Products_Name ON dbo.Products(Name);

-- Composite index for common queries
CREATE INDEX IX_Products_Category_Price ON dbo.Products(CategoryId, Price);
```

**Use views** for complex joins:
```sql
-- Instead of complex GraphQL relationships
CREATE VIEW vw_ProductDetails AS
SELECT 
    p.ProductId,
    p.Name,
    p.Price,
    c.Name AS CategoryName,
    s.Name AS SupplierName
FROM Products p
LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
LEFT JOIN Suppliers s ON p.SupplierId = s.SupplierId;
```

```bash
dab add ProductDetails \
  --source dbo.vw_ProductDetails \
  --source.type view \
  --source.key-fields "ProductId" \
  --permissions "anonymous:read"
```

---

## Security Best Practices

### Use Production Mode in Production

```bash
# Development
dab configure --runtime.host.mode development

# Production
dab configure --runtime.host.mode production
```

**Production Mode Effects**:
- Disables GraphQL introspection by default
- Reduces error detail in responses
- Optimizes for performance
- Enforces stricter security

---

### Configure CORS Properly

**❌ Don't**: Allow all origins in production
```bash
dab configure --runtime.host.cors.origins "*"
```

**✅ Do**: Specify allowed origins
```bash
# Development
dab configure --runtime.host.cors.origins "http://localhost:3000,http://localhost:4200"

# Production
dab configure --runtime.host.cors.origins "https://myapp.com,https://www.myapp.com"
```

---

### Use HTTPS in Production

**Azure App Service** (automatic):
```bash
# No configuration needed - HTTPS enforced by platform
```

**Self-hosted**:
```bash
# Use reverse proxy (nginx, IIS, Azure Application Gateway)
# Or configure Kestrel for HTTPS
export ASPNETCORE_URLS="https://localhost:5001;http://localhost:5000"
```

---

### Implement Authentication

**Development** (Simulator):
```bash
dab configure --runtime.host.authentication.provider Simulator
```

**Production** (Azure AD):
```bash
dab configure \
  --runtime.host.authentication.provider AzureAd \
  --runtime.host.authentication.jwt.audience "api://my-app-id" \
  --runtime.host.authentication.jwt.issuer "https://login.microsoftonline.com/tenant-id/v2.0"
```

---

## Relationship Best Practices

### Define Bidirectional Relationships

**Category → Products (one-to-many)**:
```bash
dab update Category \
  --relationship "products" \
  --cardinality many \
  --target.entity Product \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

**Product → Category (many-to-one)**:
```bash
dab update Product \
  --relationship "category" \
  --cardinality one \
  --target.entity Category \
  --source.fields "CategoryId" \
  --target.fields "CategoryId"
```

**Benefits**:
- Navigate in both directions
- Better GraphQL queries
- More flexible API

---

### Use Meaningful Relationship Names

**❌ Don't**: Use generic names
```bash
--relationship "items"
--relationship "data"
```

**✅ Do**: Use descriptive names
```bash
--relationship "products"
--relationship "category"
--relationship "orderLines"
--relationship "customer"
```

---

## Naming Conventions

### Entity Names

- Use **PascalCase** for entity names: `Product`, `OrderLine`, `CustomerAddress`
- Use **singular** names: `Product` not `Products`
- Use **descriptive** names: `User` not `tbl_usr`

### Field Names

- Use **camelCase** for field names: `productId`, `firstName`, `emailAddress`
- Map database names if needed: `prod_id → productId`
- Be consistent across all entities

### Relationship Names

- Use **plural** for many relationships: `products`, `orders`, `addresses`
- Use **singular** for one relationships: `category`, `customer`, `supplier`
- Use descriptive names: `orderLines` not `items`

---

## Testing Best Practices

### Validate Before Deployment

```bash
# Always validate before deploying
dab validate -c dab-config.json

# Check for common issues
# - Missing entities in database
# - Invalid permissions
# - Broken relationships
# - Schema validation errors
```

---

### Test Each Endpoint Type

**REST**:
```bash
# GET all
curl http://localhost:5000/api/Product

# GET by ID
curl http://localhost:5000/api/Product/id/1

# POST create
curl -X POST http://localhost:5000/api/Product \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":99.99}'

# PUT update
curl -X PUT http://localhost:5000/api/Product/id/1 \
  -H "Content-Type: application/json" \
  -d '{"price":89.99}'

# DELETE
curl -X DELETE http://localhost:5000/api/Product/id/1
```

**GraphQL**:
```bash
# Query
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products { id name } }"}'

# Mutation
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createProduct(item: {name:\"Test\"}) { id } }"}'
```

**MCP**:
```bash
# List tools
curl http://localhost:5000/mcp/tools/list

# Call tool
curl -X POST http://localhost:5000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"read_products","arguments":{}}'
```

---

### Use Automated Testing

Create test scripts:

**test-dab.sh**:
```bash
#!/bin/bash

# Start DAB in background
dab start &
DAB_PID=$!

# Wait for startup
sleep 5

# Test endpoints
echo "Testing REST endpoint..."
curl -f http://localhost:5000/api/Product || exit 1

echo "Testing GraphQL endpoint..."
curl -f -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products { id } }"}' || exit 1

echo "Testing health endpoint..."
curl -f http://localhost:5000/health || exit 1

# Stop DAB
kill $DAB_PID

echo "All tests passed!"
```

---

## Deployment Best Practices

### Use Environment-Specific Configurations

**dab-config.development.json**:
```json
{
  "runtime": {
    "host": { "mode": "development" },
    "cache": { "ttl-seconds": 5 }
  }
}
```

**dab-config.production.json**:
```json
{
  "runtime": {
    "host": { "mode": "production" },
    "cache": { "ttl-seconds": 300 }
  }
}
```

**Start with specific config**:
```bash
# Development
dab start -c dab-config.development.json

# Production
dab start -c dab-config.production.json
```

---

### Use Health Checks

```bash
# Health endpoint is automatically enabled
curl http://localhost:5000/health
```

**Response**:
```json
{
  "status": "Healthy",
  "duration": "00:00:00.0234567"
}
```

**Use in load balancers and monitoring**:
- Azure App Service: Configure health check endpoint
- Kubernetes: Use as liveness/readiness probe
- Docker: Use as HEALTHCHECK

---

### Monitor Your API

**Enable Application Insights** (Azure):
```json
{
  "runtime": {
    "telemetry": {
      "application-insights": {
        "enabled": true,
        "connection-string": "@env('APPLICATIONINSIGHTS_CONNECTION_STRING')"
      }
    }
  }
}
```

**Metrics to Track**:
- Request count and duration
- Error rate
- Cache hit rate
- Database query performance
- Authentication failures

---

## Documentation Best Practices

### Document Your Configuration

Create a README in your project:

**README.md**:
```markdown
# My DAB API

## Setup

1. Install DAB: `dotnet tool install --global Microsoft.DataApiBuilder`
2. Set environment variable: `export DATABASE_CONNECTION_STRING="..."`
3. Start DAB: `dab start`

## Entities

- **Product** - Product catalog (`/api/Product`)
- **Category** - Product categories (`/api/Category`)
- **Order** - Customer orders (`/api/Order`)

## Authentication

- Development: Uses Simulator (X-MS-CLIENT-PRINCIPAL header)
- Production: Azure AD (JWT tokens)

## Endpoints

- REST: http://localhost:5000/api
- GraphQL: http://localhost:5000/graphql
- Health: http://localhost:5000/health
```

---

### Provide Examples

Create an **examples.md** file:

```markdown
# API Examples

## Get all products
GET http://localhost:5000/api/Product

## Get product by ID
GET http://localhost:5000/api/Product/id/1

## Create product
POST http://localhost:5000/api/Product
Content-Type: application/json

{
  "name": "Widget",
  "price": 29.99,
  "categoryId": 1
}
```

---

## Realistic Development Checklists

### Daily Development (Inner Loop)

**When making changes to DAB config:**

- [ ] Run `dab validate` to catch errors early
- [ ] Restart DAB to pick up changes
- [ ] Test the specific endpoint you changed
- [ ] Check console for errors/warnings

**Quick commands:**
```bash
# Typical inner loop
dab validate && dab start
# Test in another terminal
curl http://localhost:5000/api/YourEntity
```

---

### Before Committing Code

**Quick quality check:**

- [ ] Run `dab validate` - must pass
- [ ] Verify `.env` is in `.gitignore`
- [ ] Check no secrets in `dab-config.json` (use `@env()` syntax)
- [ ] Test main endpoints still work
- [ ] Update `README.md` if you added entities

**2-minute check:**
```bash
dab validate && echo "✓ Config valid"
grep -q "^.env$" .gitignore && echo "✓ .env ignored"
curl -s http://localhost:5000/health | grep -q "Healthy" && echo "✓ DAB running"
```

---

### Before Deploying to Staging/Test

**Pre-deployment verification (5-10 minutes):**

- [ ] `dab validate` passes
- [ ] All environment variables documented in `README.md` or `.env.example`
- [ ] Test each entity type (GET one table, one view, one proc if applicable)
- [ ] Verify relationships return data in GraphQL
- [ ] Check permissions work (test both anonymous and authenticated if applicable)
- [ ] Confirm database connection string points to correct environment

**Realistic test script:**
```bash
#!/bin/bash
# quick-test.sh - Run before deploying

echo "1. Validating config..."
dab validate || exit 1

echo "2. Starting DAB..."
dab start &
DAB_PID=$!
sleep 5

echo "3. Testing health..."
curl -f http://localhost:5000/health || { kill $DAB_PID; exit 1; }

echo "4. Testing main entities..."
curl -f http://localhost:5000/api/Product || { kill $DAB_PID; exit 1; }
curl -f http://localhost:5000/api/Category || { kill $DAB_PID; exit 1; }

echo "5. Testing GraphQL..."
curl -f -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products { id } }"}' || { kill $DAB_PID; exit 1; }

kill $DAB_PID
echo "✓ All tests passed!"
```

---

### First Production Deployment (One-Time Setup)

**Initial production setup (plan 1-2 hours):**

- [ ] Switch to production mode: `dab configure --runtime.host.mode production`
- [ ] Configure real authentication (Azure AD, etc.) - not Simulator
- [ ] Set up proper CORS origins for your frontend domains
- [ ] Review and tighten permissions (change `anonymous:*` to specific roles/actions)
- [ ] Enable caching with production TTL (300+ seconds)
- [ ] Set up Application Insights or logging
- [ ] Configure health check monitoring
- [ ] Test with production-like data volume
- [ ] Document all environment variables needed
- [ ] Create deployment runbook

**Production config differences:**
```bash
# Switch from this (development):
--host-mode development
--auth.provider Simulator
--runtime.cors.origins "http://localhost:3000"
--cache.ttl-seconds 5

# To this (production):
--host-mode production
--auth.provider AzureAd
--runtime.cors.origins "https://myapp.com,https://www.myapp.com"
--cache.ttl-seconds 300
```

---

### Production Updates (After Initial Deployment)

**Before deploying config changes to production:**

- [ ] Tested in staging/QA environment
- [ ] Run `dab validate` on production config
- [ ] Review permission changes (if any)
- [ ] Plan rollback if needed
- [ ] Notify team of deployment window (if breaking changes)

**For routine entity additions (5 minutes):**
```bash
# Add new entity in staging first
dab add NewEntity --source dbo.NewTable --permissions "authenticated:read"
dab validate
# Test in staging
# Then apply same command to production config
```

---

### What You DON'T Need to Check Every Time

**One-time setup items (don't repeat):**
- ✅ Authentication provider configuration (set once)
- ✅ CORS origins (set once, update only when adding new domains)
- ✅ Cache TTL (set once per environment)
- ✅ Monitoring setup (set once)
- ✅ Health check configuration (automatically enabled)

**Only check when specifically changed:**
- Production vs development mode (when switching environments)
- GraphQL introspection (set per environment)
- Error detail level (set per environment)

---

### Realistic Time Estimates

| Task | Time | When |
|------|------|------|
| Inner loop (change → test) | 30 seconds | Every code change |
| Pre-commit validation | 2 minutes | Before every commit |
| Pre-staging deployment | 5-10 minutes | Before deploying to test |
| First production setup | 1-2 hours | Once per project |
| Production config updates | 5-15 minutes | When adding/changing entities |

---

### Minimum Viable Checks

**If you're short on time, at minimum do this:**

**Development:**
```bash
dab validate  # Must pass
```

**Before any deployment:**
```bash
dab validate                    # Must pass
curl http://localhost:5000/health  # Must return healthy
# Test one critical endpoint works
```

**That's it.** Everything else is optimization.
