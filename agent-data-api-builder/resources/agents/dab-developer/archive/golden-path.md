# The Golden Path to REST & GraphQL APIs

## From "Database" to "Deployed API" in Under 5 Minutes

You have a database with tables, views, and stored procedures. You need to expose them as REST and GraphQL APIs. Traditional approach: write custom API code, configure routing, handle pagination, implement security. Time: days to weeks.

**The Golden Path**: Use Data API Builder to generate production-ready APIs from configuration—no custom code required.

---

## What Makes This the "Golden Path"?

| Feature | Benefit |
|---------|---------|
| **Zero Code** | Configuration-driven, no API code to write |
| **Framework Detection** | Auto-detects SQL Server, PostgreSQL, MySQL, Cosmos DB |
| **Built-in Guardrails** | Knows what NOT to do (e.g., never use anonymous:* in production) |
| **Troubleshooting Built-In** | Solutions for connection errors, permission issues, schema problems |
| **Time Savings** | What takes days takes minutes |

---

## The Traditional Approach: Building APIs from Scratch

**Typical Tasks**:
1. Set up API framework (Express, ASP.NET, FastAPI)
2. Write database connection logic
3. Create CRUD endpoints for each table
4. Implement pagination, filtering, sorting
5. Add authentication and authorization
6. Build GraphQL resolvers
7. Handle relationships between entities
8. Write tests
9. Document endpoints
10. Deploy and maintain

**Time**: Days to weeks per API

**Lines of Code**: Hundreds to thousands

---

## The Golden Path: With Data API Builder

### Step 1: Install DAB (30 seconds)

**You**: "Set up Data API Builder for my SQL Server database"

**Agent**: 
```bash
# Install DAB CLI globally
dotnet tool install --global Microsoft.DataApiBuilder

# Verify installation
dab --version
# Output: Microsoft.DataApiBuilder 1.2.10
```

✅ **One command, globally available**

---

### Step 2: Initialize Configuration (45 seconds)

**You**: "Create a DAB config for my SQL Server database"

**Agent**:
```bash
# Auto-detect framework and create configuration
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development \
  --rest.enabled true \
  --graphql.enabled true \
  --mcp.enabled true

# Set your connection string
$env:DATABASE_CONNECTION_STRING="Server=localhost;Database=Northwind;Integrated Security=true;TrustServerCertificate=true"
```

**Creates**: `dab-config.json` with all runtime settings configured

✅ **Environment-based config, secure by default**

---

### Step 3: Add Database Entities (1 minute)

**You**: "Add all my tables as API entities"

**Agent**:
```bash
# Query database schema
sqlcmd -S localhost -d Northwind -Q "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"

# Add entities
dab add Product --source dbo.Products --permissions "anonymous:*"
dab add Category --source dbo.Categories --permissions "anonymous:*"
dab add Order --source dbo.Orders --permissions "anonymous:*"

# Add relationships
dab update Product --relationship category --target.entity Category --cardinality one
dab update Order --relationship customer --target.entity Customer --cardinality one
```

✅ **CLI handles all JSON updates, no manual editing**

---

### Step 4: Validate Configuration (15 seconds)

**You**: "Check if my config is valid"

**Agent**:
```bash
dab validate

# Output:
# ✓ Configuration file is valid
# ✓ All entities have valid sources
# ✓ All relationships are properly configured
# ✓ Database connection successful
```

✅ **Catches errors before runtime**

---

### Step 5: Start the API (10 seconds)

**You**: "Start the DAB engine"

**Agent**:
```bash
dab start

# Output:
# info: Microsoft.DataApiBuilder.Service[0]
#       Starting Data API Builder...
# info: REST endpoint: http://localhost:5000/api
# info: GraphQL endpoint: http://localhost:5000/graphql
# info: MCP endpoint: http://localhost:5000/mcp
```

✅ **Three API types running instantly**

---

### Step 6: Test Your APIs (30 seconds)

**You**: "Show me how to test the endpoints"

**Agent**:
```bash
# REST API - Get all products
curl http://localhost:5000/api/Product

# REST API - Get single product with category
curl http://localhost:5000/api/Product/1?$expand=category

# GraphQL - Query with relationships
curl http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products { id name category { name } } }"}'

# MCP - List available tools
curl http://localhost:5000/mcp/tools
```

✅ **REST, GraphQL, and MCP all working**

---

## Total Time: Under 5 Minutes

| Task | Traditional | Golden Path |
|------|------------|-------------|
| Setup framework | 15-30 min | 30 sec |
| Configure database | 10-20 min | 45 sec |
| Create CRUD endpoints | Hours | 1 min |
| Add relationships | Hours | 1 min |
| Test & validate | 15-30 min | 1 min |
| **Total** | **Days to weeks** | **< 5 minutes** |
| **Lines of Code** | **Hundreds+** | **Zero** |

---

## Built-in Framework Detection

The agent knows database-specific details. See [dab-init.md](dab-init.md) for connection string patterns by database type.

**Supported databases:** SQL Server, Azure SQL, PostgreSQL, MySQL, Cosmos DB

---

## Built-in Guardrails

### ❌ What the Agent Won't Do

**Never use `anonymous:*` in production**:
```bash
# Development mode - OK
dab add Product --permissions "anonymous:*"

# Production mode - Agent warns
"⚠️ Using anonymous:* in production is insecure. 
Configure authentication and use role-based permissions:
--permissions 'authenticated:read' or 'admin:*'"
```

**Never hardcode connection strings**:
```bash
# ❌ Agent prevents this
dab init --connection-string "Server=...;Password=secret"

# ✅ Agent recommends this
dab init --connection-string "@env('DATABASE_CONNECTION_STRING')"
```

**Never skip validation**:
```bash
# Agent always runs validation before start
dab validate && dab start
```

---

## Built-in Troubleshooting

### Common Issue: Connection Failed

**Agent detects and fixes**:
```bash
# Error: Cannot connect to database

# Agent checks:
1. Is SQL Server running? → sqlcmd -S localhost -Q "SELECT 1"
2. Is connection string correct? → Check format
3. Is TrustServerCertificate needed? → Add to connection string
4. Are firewall rules correct? → Test with telnet

# Agent provides exact fix:
$env:DATABASE_CONNECTION_STRING="Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true"
```

### Common Issue: 404 on API Endpoints

**Agent detects and fixes**:
```bash
# Error: GET /api/Product returns 404

# Agent checks:
1. Is entity configured? → dab validate
2. Is REST enabled? → Check runtime.rest.enabled
3. Is entity name correct? → Case-sensitive
4. Is DAB running? → Check dab start output

# Agent provides exact fix:
dab configure --runtime.rest.enabled true
dab start
```

### Common Issue: GraphQL Schema Empty

**Agent detects and fixes**:
```bash
# Error: GraphQL schema has no types

# Agent checks:
1. Are entities added? → dab validate
2. Is GraphQL enabled? → Check runtime.graphql.enabled
3. Are permissions set? → Each entity needs permissions

# Agent provides exact fix:
dab add Product --permissions "anonymous:*"
dab configure --runtime.graphql.enabled true
```

---

## Scenario-Based Workflows

### Scenario 1: Microservice for E-Commerce Products

**You**: "Create a product catalog API for my e-commerce site"

**Agent provides complete workflow**:
```bash
# 1. Initialize
dab init --database-type mssql --connection-string "@env('DB_CONN')"

# 2. Add product entities
dab add Product --source dbo.Products --permissions "anonymous:read" --permissions "admin:*"
dab add Category --source dbo.Categories --permissions "anonymous:read"
dab add Review --source dbo.Reviews --permissions "authenticated:create,read"

# 3. Configure relationships
dab update Product --relationship category --target.entity Category --cardinality one
dab update Product --relationship reviews --target.entity Review --cardinality many

# 4. Enable features
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 300

# 5. Start and test
dab start
curl http://localhost:5000/api/Product?$filter=price lt 100&$orderby=name
```

### Scenario 2: Internal Dashboard with Auth

**You**: "Create an admin dashboard API with JWT authentication"

**Agent provides complete workflow**:
```bash
# 1. Initialize with production mode
dab init --database-type mssql --host-mode production

# 2. Configure authentication
dab configure \
  --auth.provider AzureAD \
  --auth.audience "your-audience" \
  --auth.issuer "https://login.microsoftonline.com/your-tenant"

# 3. Add entities with role-based permissions
dab add User --source dbo.Users --permissions "admin:*"
dab add Order --source dbo.Orders --permissions "admin:*" --permissions "user:read"
dab add Report --source dbo.Reports --permissions "admin:read"

# 4. Start with HTTPS
dab start --https
```

### Scenario 3: GraphQL API for Mobile App

**You**: "Create a GraphQL API optimized for mobile"

**Agent provides complete workflow**:
```bash
# 1. Initialize GraphQL-focused config
dab init --rest.enabled false --graphql.enabled true

# 2. Add entities
dab add Post --source dbo.Posts
dab add Comment --source dbo.Comments
dab add User --source dbo.Users

# 3. Configure relationships
dab update Post --relationship author --target.entity User --cardinality one
dab update Post --relationship comments --target.entity Comment --cardinality many
dab update Comment --relationship author --target.entity User --cardinality one

# 4. Enable caching for mobile performance
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 60

# 5. Test GraphQL query
curl http://localhost:5000/graphql -d '{
  "query": "{ posts { id title author { name } comments { text } } }"
}'
```

---

## Key Takeaways

✅ **Zero to API in 5 minutes**: What traditionally takes days takes minutes

✅ **Configuration over code**: No custom API code to write, maintain, or debug

✅ **Framework awareness**: Agent knows connection strings, ports, features for each database

✅ **Built-in best practices**: Environment variables, role-based permissions, validation

✅ **Proactive troubleshooting**: Agent catches common issues and provides exact fixes

✅ **Production-ready**: Handles auth, caching, pagination, relationships automatically

---

## Additional Scenario Patterns

Beyond the core scenarios above, DAB handles these advanced patterns:

### Stored Procedures as REST Endpoints
Expose legacy stored procedures as modern REST APIs:
```bash
dab add GetCustomerOrders --source dbo.GetCustomerOrders \
  --source.type stored-procedure --rest.methods "GET" --permissions "authenticated:execute"
```

### Read-Only Data Warehouse API
GraphQL-only API with aggressive caching for analytics:
```bash
dab init --rest.enabled false --graphql.enabled true
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 3600
dab add FactSales --source dbo.FactSales --permissions "analyst:read"
```

### MCP Server for AI Agents
Enable AI assistants to query your database via Model Context Protocol:
```bash
dab init --mcp.enabled true --runtime.mcp.path "/mcp"
dab add FAQ --source dbo.FAQ --permissions "agent:read"
# AI agents can now use describe_entities, read_records, etc.
```

---

## Next Steps

1. **Try it**: Install DAB and run through the 5-minute workflow
2. **Explore**: Add your own tables and test the REST/GraphQL endpoints
3. **Deploy**: Use Docker or Azure Container Apps for production
4. **Extend**: Add custom policies, configure caching, enable MCP for AI agents

The golden path is tested, documented, and ready to use. Start building APIs in minutes instead of days.
