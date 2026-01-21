# DAB Agent (Data API Builder)

GitHub Copilot chat participant **`@dab`** for [Data API Builder](https://learn.microsoft.com/azure/data-api-builder/) - create REST, GraphQL, and MCP APIs from your database without writing code.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/jerry-nixon.agent-data-api-builder?label=VS%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.agent-data-api-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Data API Builder?

**Data API Builder (DAB)** is a free, open-source tool from Microsoft that instantly creates:

| Endpoint | Description |
|----------|-------------|
| **REST API** | Full CRUD operations with OData-style filtering, pagination |
| **GraphQL API** | Queries, mutations, subscriptions with nested relationships |
| **MCP API** | Model Context Protocol for AI tool integration (Claude, Copilot, etc.) |

All from a single JSON configuration file - no code required! DAB is a foundational component of Microsoft Fabric, making it enterprise-ready and high-performance.

**Supported Databases:** SQL Server, Azure SQL, PostgreSQL, MySQL, Cosmos DB

## Features

### `@dab` Chat Participant

Use `@dab` in GitHub Copilot Chat for expert DAB assistance:

- **Natural language**: Just describe what you need - "Add the Products table"
- **Intent detection**: Automatically routes to the right handler
- **Context-aware**: Uses your workspace files and DAB configuration
- **LLM-powered**: Falls back to AI for complex questions with full DAB context

### Bundled DAB Developer Agent

This extension **automatically includes** the DAB Developer coding agent - no setup required! The agent is bundled directly in the extension and available immediately after installation.

The bundled agent provides:

| Skill | Purpose |
|-------|---------|
| **dab-init** | Initialize new DAB configurations |
| **dab-add** | Add database objects as API entities |
| **dab-update** | Modify entities, relationships, mappings |
| **dab-configure** | Change runtime settings |
| **dab-validate** | Validate configuration files |
| **dab-start** | Start the DAB engine |

Plus comprehensive documentation on:
- Entity configuration and permissions
- Relationship setup (one-to-many, many-to-many)
- MCP server integration
- Best practices and troubleshooting

## Usage Examples

### Initialize DAB

```
@dab Initialize a new DAB configuration
```
Creates a new configuration with auto-detected connection string from `.env`.

### Add Database Objects

```
@dab Add the Products table with read permissions
```
Add tables, views, or stored procedures as API entities.

### Configure Relationships

```
@dab Set up a relationship where Author has many Books
```
Set up one-to-many, many-to-many, or self-referencing relationships.

### Enable MCP for AI

```
@dab Enable MCP and expose my stored procedures as AI tools
```
Configure MCP endpoints so AI assistants can query your database.

### Troubleshoot Issues

```
@dab I'm getting a connection error, help me fix it
```
Get targeted help for common DAB problems.

### Ask Questions

```
@dab How do I implement row-level security?
```
Get expert guidance powered by AI with full DAB documentation context.

## Quick Start

1. **Install the DAB CLI**:
   ```bash
   dotnet tool install -g Microsoft.DataApiBuilder
   ```

2. **Create a `.env` file** with your connection string:
   ```env
   DATABASE_CONNECTION_STRING=Server=localhost;Database=MyDb;Integrated Security=true;TrustServerCertificate=true
   ```

3. **Initialize**: Type `@dab Initialize DAB` in Copilot Chat

4. **Add entities**: Type `@dab Add the Products table with read permissions`

5. **Start the API**: Type `@dab Start the server`

6. **Access your API**:
   - REST: `http://localhost:5000/api/Products`
   - GraphQL: `http://localhost:5000/graphql`

## Commands

| Command | Description |
|---------|-------------|
| `DAB: Open DAB Chat` | Opens GitHub Copilot Chat with `@dab` prefilled |

## Requirements

- Visual Studio Code 1.95.0 or higher
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension
- [DAB CLI](https://learn.microsoft.com/azure/data-api-builder/command-line/install) (recommended)

## MCP Integration

Enable MCP to let AI assistants (Claude, Copilot, Cursor, etc.) interact with your database:

```
@dab Enable MCP for my database
```

After enabling, configure your AI client with:

```json
{
  "mcpServers": {
    "my-database": {
      "url": "http://localhost:5000/mcp"
    }
  }
}
```

### Expose Stored Procedures as AI Tools

```bash
# Add the stored procedure
dab add GetBookById --source dbo.usp_GetBookById --source.type stored-procedure --permissions "anonymous:execute"

# Enable as MCP tool
dab update GetBookById --mcp.custom-tool true
```

Now AI assistants can call your stored procedure as a tool!

## Learn More

| Resource | Link |
|----------|------|
| Official Documentation | [learn.microsoft.com/azure/data-api-builder](https://learn.microsoft.com/azure/data-api-builder/) |
| CLI Reference | [dab command-line](https://learn.microsoft.com/azure/data-api-builder/reference-command-line-interface) |
| Configuration Schema | [Configuration reference](https://learn.microsoft.com/azure/data-api-builder/reference-configuration) |
| REST API | [REST endpoints](https://learn.microsoft.com/azure/data-api-builder/rest) |
| GraphQL API | [GraphQL endpoints](https://learn.microsoft.com/azure/data-api-builder/graphql) |
| GitHub Repository | [Azure/data-api-builder](https://github.com/Azure/data-api-builder) |

## Related Extensions

This extension is part of the **Data API Builder Extension Suite**:

- [DAB Omnibus](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.omnibus-data-api-builder) - All commands in one package
- [DAB Init](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.init-data-api-builder) - Initialize configurations
- [DAB Add](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.add-data-api-builder) - Add entities
- [DAB Start](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.start-data-api-builder) - Start/stop engine
- [DAB Validate](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.validate-data-api-builder) - Validate configs
- [DAB Health](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.health-data-api-builder) - Health checks
- [DAB Visualize](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.visualize-data-api-builder) - Visualize entities
- [DAB POCO](https://marketplace.visualstudio.com/items?itemName=jerry-nixon.poco-data-api-builder) - Generate C# classes

## License

MIT - See [LICENSE.txt](LICENSE.txt)
