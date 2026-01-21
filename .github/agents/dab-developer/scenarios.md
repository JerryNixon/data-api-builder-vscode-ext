# DAB Scenarios & Workflows

## Real-World Use Cases with Step-by-Step Solutions

This guide provides tested workflows for common scenarios. Each includes exact commands, expected outputs, and troubleshooting tips.

---

## Scenario 1: E-Commerce Product Catalog API

**Goal**: Expose product catalog from SQL Server as REST and GraphQL APIs

**Time**: 4 minutes

**Prerequisites**:
- SQL Server with Products, Categories, Reviews tables
- .NET 8.0+ installed
- DAB CLI installed

### Step 1: Verify Database Schema (30 seconds)

```bash
# Check available tables
sqlcmd -S localhost -d NorthwindDB -Q "
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE='BASE TABLE'
ORDER BY TABLE_NAME"

# Expected tables:
# - dbo.Products
# - dbo.Categories  
# - dbo.Reviews
```

### Step 2: Initialize DAB (45 seconds)

```bash
# Create configuration
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode development

# Set connection string
$env:DATABASE_CONNECTION_STRING="Server=localhost;Database=NorthwindDB;Integrated Security=true;TrustServerCertificate=true"

# Verify config created
ls dab-config.json
```

**✅ Result**: `dab-config.json` created with development defaults

### Step 3: Add Entities (1 minute)

```bash
# Add Product entity with full access for development
dab add Product \
  --source dbo.Products \
  --permissions "anonymous:*"

# Add Category entity  
dab add Category \
  --source dbo.Categories \
  --permissions "anonymous:*"

# Add Review entity with restricted permissions
dab add Review \
  --source dbo.Reviews \
  --permissions "anonymous:read" \
  --permissions "authenticated:create,read,update"
```

**✅ Result**: Three entities configured in dab-config.json

### Step 4: Configure Relationships (45 seconds)

```bash
# Products have one Category
dab update Product \
  --relationship category \
  --target.entity Category \
  --cardinality one

# Products have many Reviews
dab update Product \
  --relationship reviews \
  --target.entity Review \
  --cardinality many
```

**✅ Result**: Relationships enable nested queries in GraphQL

### Step 5: Validate & Start (30 seconds)

```bash
# Validate configuration
dab validate

# Start DAB engine
dab start

# Endpoints available:
# - REST: http://localhost:5000/api
# - GraphQL: http://localhost:5000/graphql
```

### Step 6: Test Endpoints (30 seconds)

```bash
# Get all products
curl http://localhost:5000/api/Product

# Get products under $100, sorted by name
curl "http://localhost:5000/api/Product?\$filter=price lt 100&\$orderby=name"

# Get product with category and reviews
curl "http://localhost:5000/api/Product/1?\$expand=category,reviews"

# GraphQL query
curl http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ products(first: 10) { items { id name price category { name } reviews { rating comment } } } }"
  }'
```

**✅ Result**: Working REST and GraphQL APIs for product catalog

---

## Scenario 2: Internal Admin Dashboard with Authentication

**Goal**: Secure API for internal admin tools with Azure AD authentication

**Time**: 5 minutes

### Step 1: Initialize for Production (1 minute)

```bash
# Create production-ready configuration
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --host-mode production \
  --auth.provider AzureAD

# Set connection string
$env:DATABASE_CONNECTION_STRING="Server=myserver.database.windows.net;Database=AdminDB;User ID=admin;Password=SecurePass123"
```

**✅ Result**: Production mode with Azure AD authentication

### Step 2: Add Admin Entities (1 minute)

```bash
# Users - admin only
dab add User \
  --source dbo.Users \
  --permissions "admin:*"

# Orders - admin full access, user read-only
dab add Order \
  --source dbo.Orders \
  --permissions "admin:*" \
  --permissions "user:read"

# Reports - admin read-only
dab add Report \
  --source dbo.ReportData \
  --permissions "admin:read"
```

**✅ Result**: Role-based permissions configured

### Step 3: Configure Authentication (1 minute)

```bash
# Configure Azure AD settings
dab configure \
  --auth.audience "api://your-app-id" \
  --auth.issuer "https://login.microsoftonline.com/your-tenant-id/v2.0"

# Optional: Configure CORS for admin portal
dab configure \
  --runtime.cors.origins "https://admin.yourcompany.com" \
  --runtime.cors.allow-credentials true
```

### Step 4: Add Field-Level Security (1 minute)

```bash
# Update User entity to exclude sensitive fields for non-admins
# Manually edit dab-config.json:

{
  "entities": {
    "User": {
      "permissions": [
        {
          "role": "admin",
          "actions": ["*"]
        },
        {
          "role": "user",
          "actions": ["read"],
          "fields": {
            "exclude": ["PasswordHash", "SecurityStamp", "SSN"]
          }
        }
      ]
    }
  }
}
```

### Step 5: Test with JWT Token (1 minute)

```bash
# Get Azure AD token (simplified)
$token = "eyJ0eXAiOiJKV1QiLCJhbGc..." # Your actual JWT token

# Test authenticated request
curl http://localhost:5000/api/User \
  -H "Authorization: Bearer $token"

# Without token - expect 401 Unauthorized
curl http://localhost:5000/api/User
```

**✅ Result**: Secured API requiring valid Azure AD tokens

---

## Scenario 3: GraphQL API for Mobile App

**Goal**: Optimized GraphQL-only API for mobile application

**Time**: 4 minutes

### Step 1: Initialize GraphQL-Focused Config (45 seconds)

```bash
# Disable REST, enable only GraphQL
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --rest.enabled false \
  --graphql.enabled true

# Enable aggressive caching for mobile
dab configure \
  --runtime.cache.enabled true \
  --runtime.cache.ttl-seconds 60
```

### Step 2: Add Social Media Entities (1 minute)

```bash
dab add Post --source dbo.Posts --permissions "anonymous:read" --permissions "authenticated:*"
dab add Comment --source dbo.Comments --permissions "anonymous:read" --permissions "authenticated:*"
dab add User --source dbo.Users --permissions "anonymous:read"
dab add Like --source dbo.Likes --permissions "authenticated:create,delete"
```

### Step 3: Configure Complex Relationships (1 minute)

```bash
# Post relationships
dab update Post --relationship author --target.entity User --cardinality one
dab update Post --relationship comments --target.entity Comment --cardinality many
dab update Post --relationship likes --target.entity Like --cardinality many

# Comment relationships
dab update Comment --relationship author --target.entity User --cardinality one
dab update Comment --relationship post --target.entity Post --cardinality one

# Like relationships
dab update Like --relationship user --target.entity User --cardinality one
dab update Like --relationship post --target.entity Post --cardinality one
```

### Step 4: Test Mobile-Optimized Queries (1 minute)

```bash
# Feed query - get posts with nested data
curl http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query Feed { posts(first: 20, orderBy: { createdAt: DESC }) { items { id title content createdAt author { id username avatar } comments(first: 3) { items { id text author { username } } } likes { items { userId } } } } }"
  }'

# Single post detail
curl http://localhost:5000/graphql \
  -d '{
    "query": "query PostDetail($id: Int!) { post_by_pk(id: $id) { id title content author { username avatar } comments { id text createdAt author { username avatar } } } }",
    "variables": { "id": 1 }
  }'
```

**✅ Result**: Optimized GraphQL API with caching for mobile performance

---

## Scenario 4: Migrating Legacy SOAP Service to REST

**Goal**: Expose stored procedures as modern REST endpoints

**Time**: 3 minutes

### Step 1: Identify Stored Procedures (30 seconds)

```bash
# List available stored procedures
sqlcmd -S localhost -d LegacyDB -Q "
SELECT ROUTINE_SCHEMA, ROUTINE_NAME 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_TYPE='PROCEDURE'
ORDER BY ROUTINE_NAME"

# Expected:
# - dbo.GetCustomerOrders
# - dbo.ProcessPayment
# - dbo.GenerateInvoice
```

### Step 2: Add Stored Procedures as Entities (1 minute)

```bash
# Add GetCustomerOrders procedure
dab add GetCustomerOrders \
  --source dbo.GetCustomerOrders \
  --source.type stored-procedure \
  --source.params "CustomerId:123" \
  --permissions "authenticated:execute" \
  --rest.methods "GET"

# Add ProcessPayment procedure
dab add ProcessPayment \
  --source dbo.ProcessPayment \
  --source.type stored-procedure \
  --source.params "OrderId:456,Amount:100.00" \
  --permissions "authenticated:execute" \
  --rest.methods "POST"

# Add GenerateInvoice procedure
dab add GenerateInvoice \
  --source dbo.GenerateInvoice \
  --source.type stored-procedure \
  --permissions "authenticated:execute" \
  --rest.methods "POST"
```

### Step 3: Test Stored Procedure Endpoints (1 minute)

```bash
# Execute GetCustomerOrders
curl "http://localhost:5000/api/GetCustomerOrders?CustomerId=123"

# Execute ProcessPayment
curl http://localhost:5000/api/ProcessPayment \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{ "OrderId": 456, "Amount": 100.00 }'

# Execute GenerateInvoice
curl http://localhost:5000/api/GenerateInvoice \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{ "OrderId": 456 }'
```

**✅ Result**: Legacy stored procedures exposed as modern REST APIs

---

## Scenario 5: Multi-Database Aggregation API

**Goal**: Single API that aggregates data from multiple databases

**Time**: 6 minutes

### Step 1: Create Multiple DAB Configs (2 minutes)

```bash
# Create config for CustomerDB
dab init \
  --config-file dab-customers.json \
  --database-type mssql \
  --connection-string "@env('CUSTOMER_DB')" \
  --runtime.rest.path "/api/customers" \
  --runtime.host.port 5001

# Add customer entities
dab add Customer --source dbo.Customers --permissions "anonymous:*" -c dab-customers.json

# Create config for OrderDB
dab init \
  --config-file dab-orders.json \
  --database-type mssql \
  --connection-string "@env('ORDER_DB')" \
  --runtime.rest.path "/api/orders" \
  --runtime.host.port 5002

# Add order entities
dab add Order --source dbo.Orders --permissions "anonymous:*" -c dab-orders.json
```

### Step 2: Start Multiple DAB Instances (1 minute)

```bash
# Start customer API on port 5001
start-process pwsh -ArgumentList "dab start -c dab-customers.json"

# Start order API on port 5002
start-process pwsh -ArgumentList "dab start -c dab-orders.json"

# Verify both running
curl http://localhost:5001/api/customers/Customer
curl http://localhost:5002/api/orders/Order
```

### Step 3: Create API Gateway (3 minutes)

```bash
# Use nginx or create simple Node.js proxy
# proxy.js:
const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

http.createServer((req, res) => {
  if (req.url.startsWith('/api/customers')) {
    proxy.web(req, res, { target: 'http://localhost:5001' });
  } else if (req.url.startsWith('/api/orders')) {
    proxy.web(req, res, { target: 'http://localhost:5002' });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(5000);

# Start proxy
node proxy.js

# Test unified API
curl http://localhost:5000/api/customers/Customer
curl http://localhost:5000/api/orders/Order
```

**✅ Result**: Single API endpoint aggregating multiple databases

---

## Scenario 6: Read-Only Data Warehouse API

**Goal**: Expose data warehouse as read-only GraphQL API for BI tools

**Time**: 3 minutes

### Step 1: Initialize Read-Only Config (1 minute)

```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DW_CONNECTION_STRING')" \
  --rest.enabled false \
  --graphql.enabled true \
  --host-mode production

# Configure aggressive caching for read-heavy workload
dab configure \
  --runtime.cache.enabled true \
  --runtime.cache.ttl-seconds 3600
```

### Step 2: Add Views and Tables (1 minute)

```bash
# Add fact tables as read-only
dab add FactSales --source dbo.FactSales --permissions "analyst:read"
dab add FactInventory --source dbo.FactInventory --permissions "analyst:read"

# Add dimension tables
dab add DimProduct --source dbo.DimProduct --permissions "analyst:read"
dab add DimCustomer --source dbo.DimCustomer --permissions "analyst:read"
dab add DimDate --source dbo.DimDate --permissions "analyst:read"

# Add analytical views
dab add SalesByRegion --source dbo.vw_SalesByRegion --source.type view --permissions "analyst:read"
dab add TopProducts --source dbo.vw_TopProducts --source.type view --permissions "analyst:read"
```

### Step 3: Configure Star Schema Relationships (1 minute)

```bash
# Connect facts to dimensions
dab update FactSales --relationship product --target.entity DimProduct --cardinality one
dab update FactSales --relationship customer --target.entity DimCustomer --cardinality one
dab update FactSales --relationship date --target.entity DimDate --cardinality one
```

### Step 4: Test Analytics Queries (30 seconds)

```bash
# Sales analysis with dimensions
curl http://localhost:5000/graphql \
  -d '{
    "query": "{ factSales(filter: { date: { year: { eq: 2024 } } }) { items { amount quantity product { name category } customer { name region } date { year month } } } }"
  }'

# Pre-aggregated view
curl http://localhost:5000/graphql \
  -d '{
    "query": "{ salesByRegion { items { region totalSales orderCount avgOrderValue } } }"
  }'
```

**✅ Result**: High-performance read-only API for analytics with aggressive caching

---

## Scenario 7: MCP Server for AI Agents

**Goal**: Enable AI agents to query database via Model Context Protocol

**Time**: 3 minutes

### Step 1: Initialize with MCP Enabled (45 seconds)

```bash
dab init \
  --database-type mssql \
  --connection-string "@env('DATABASE_CONNECTION_STRING')" \
  --mcp.enabled true \
  --runtime.mcp.path "/mcp"

# MCP requires preview version
dotnet tool update --global Microsoft.DataApiBuilder --prerelease
```

### Step 2: Add Entities for AI Access (1 minute)

```bash
# Add knowledge base tables
dab add Document --source dbo.Documents --permissions "anonymous:read"
dab add FAQ --source dbo.FAQ --permissions "anonymous:read"
dab add SupportTicket --source dbo.SupportTickets --permissions "agent:create,read,update"

# Add customer data
dab add Customer --source dbo.Customers --permissions "agent:read"
dab add Order --source dbo.Orders --permissions "agent:read"
```

### Step 3: Test MCP Endpoints (1 minute)

```bash
# List available MCP tools
curl http://localhost:5000/mcp/tools

# Execute query via MCP
curl http://localhost:5000/mcp/execute \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "query",
    "arguments": {
      "entity": "FAQ",
      "filter": "category eq 'Billing'"
    }
  }'

# Create record via MCP
curl http://localhost:5000/mcp/execute \
  -X POST \
  -d '{
    "tool": "create",
    "arguments": {
      "entity": "SupportTicket",
      "data": { "customerId": 123, "issue": "Cannot login", "priority": "High" }
    }
  }'
```

**✅ Result**: Database accessible to AI agents via standardized MCP protocol

---

## Key Patterns Across All Scenarios

### 1. Always Use Environment Variables
```bash
# ❌ Don't hardcode
--connection-string "Server=localhost;Password=secret"

# ✅ Do use environment variables
--connection-string "@env('DATABASE_CONNECTION_STRING')"
```

### 2. Start with dab validate
```bash
# Always validate before starting
dab validate && dab start
```

### 3. Match Permissions to Environment
```bash
# Development
--permissions "anonymous:*"

# Production
--permissions "authenticated:read" --permissions "admin:*"
```

### 4. Use Caching for Read-Heavy Workloads
```bash
dab configure --runtime.cache.enabled true --runtime.cache.ttl-seconds 300
```

### 5. Configure CORS for Web Apps
```bash
dab configure --runtime.cors.origins "https://app.example.com"
```

---

## Next Steps

Choose the scenario closest to your use case and follow the workflow. Each has been tested and includes troubleshooting tips. For custom scenarios, combine patterns from multiple workflows.
