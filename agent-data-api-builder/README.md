# DAB Agent Skills (Data API Builder)

Copilot Chat **skills pack** for [Data API Builder](https://learn.microsoft.com/azure/data-api-builder/) - guides Copilot to create REST, GraphQL, and MCP APIs from your database without writing code.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/jerry-nixon.agent-data-api-builder?label=VS%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.agent-data-api-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Data API Builder?

**Data API Builder (DAB)** is a free, open-source tool from Microsoft that instantly creates:

| Endpoint | Description |
|----------|-------------|
| **REST API** | Full CRUD operations with OData-style filtering, pagination |
| **GraphQL API** | Queries, mutations, and nested relationships |
| **MCP API** | Model Context Protocol for AI tool integration (Claude, Copilot, etc.) |

All from a single JSON configuration file - no code required! DAB is a foundational component of Microsoft Fabric.

**Supported Databases:** SQL Server, Azure SQL, PostgreSQL, MySQL, Cosmos DB

## How this extension works

This extension contributes a comprehensive set of **Copilot Chat skills** that activate automatically based on what you ask. There is no `@dab` chat participant - you just talk to Copilot normally and the relevant skill is invoked.

For example, asking *"add a one-to-many relationship between Products and Categories"* will load the `data-api-builder-relationships` skill; asking *"deploy DAB to App Service"* will load the `azure-app-service-data-api-builder` skill.

## Skills

### Core
- `data-api-builder-cli` - all `dab` commands and flags
- `data-api-builder-config` - `dab-config.json` structure and entities
- `data-api-builder-auto-config` - generate config from your database schema
- `data-api-builder-relationships` - 1-1, 1-N, N-N, self-referencing
- `data-api-builder-rest` - REST surface mastery (`$filter`, `$select`, paging)
- `data-api-builder-graphql` - GraphQL surface mastery (queries, mutations, filters)

### Security
- `data-api-builder-auth` - quick auth pattern picker
- `data-api-builder-auth-mastery` - end-to-end provider/flow guide
- `data-api-builder-rls-policies` - DAB DB policies, SQL RLS, SESSION_CONTEXT

### Runtime
- `data-api-builder-caching` - HTTP cache headers, L1, L2 (Redis)
- `data-api-builder-health` - `/health` endpoint and custom checks
- `data-api-builder-observability` - App Insights, Log Analytics, OpenTelemetry

### MCP
- `data-api-builder-mcp` - enable and control `/mcp`
- `data-api-builder-mcp-mastery` - descriptions for tool quality and safety
- `aspire-mcp-inspector`, `azure-mcp-inspector` - debug the MCP surface

### Local runtime
- `docker-data-api-builder` - Docker Compose for DAB + SQL
- `aspire-data-api-builder`, `aspire-sql-commander`, `aspire-sql-projects` - .NET Aspire orchestration

### Cloud / deployment
- `azure-deployment-data-api-builder` - choose between ACA, App Service, ACI, AKS
- `azure-data-api-builder` - Azure Container Apps with `azd`
- `azure-app-service-data-api-builder` - App Service Linux containers
- `azure-sql-commander` - SQL browser in Azure

### Meta
- `data-api-builder-demo` - quickstart asset conventions
- `creating-agent-skills` - author and audit Copilot skills

## Companion extensions

For interactive UI commands (validate, start, add entity), install the companion task extensions: `init-data-api-builder`, `add-data-api-builder`, `start-data-api-builder`, `validate-data-api-builder`, `health-data-api-builder`, `visualize-data-api-builder`, `docker-data-api-builder`, `poco-data-api-builder` - or install the `omnibus-data-api-builder` extension pack to get them all.

## License

MIT - see [LICENSE.txt](LICENSE.txt).
