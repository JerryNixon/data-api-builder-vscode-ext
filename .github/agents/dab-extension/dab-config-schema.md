# DAB Configuration Schema Reference

## Overview

Data API Builder (DAB) uses JSON configuration files to define entities, data sources, and runtime settings. This document describes the schema used in DAB config files.

## Configuration File Structure

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/download/vmajor.minor.patch/dab.draft.schema.json",
  "data-source": { ... },
  "runtime": { ... },
  "entities": { ... }
}
```

## Data Source

Defines the database connection and type.

```json
{
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('MSSQL_CONNECTION_STRING')",
    "options": {
      "set-session-context": true
    }
  }
}
```

### Database Types
- `mssql` - Microsoft SQL Server
- `postgresql` - PostgreSQL
- `mysql` - MySQL
- `cosmosdb_nosql` - Azure Cosmos DB
- `cosmosdb_postgresql` - Cosmos DB for PostgreSQL

### Connection String Syntax
**Environment Variable:**
```json
"connection-string": "@env('VAR_NAME')"
```

**Direct (not recommended):**
```json
"connection-string": "Server=localhost;Database=MyDb;..."
```

### Extracting Environment Variable Name
Use `extractEnvVarName` utility from shared package:
```typescript
import { extractEnvVarName } from 'dab-vscode-shared/config/utils';

const varName = extractEnvVarName("@env('MSSQL_CONNECTION_STRING')");
// Returns: "MSSQL_CONNECTION_STRING"
```

## Runtime Configuration

Defines API endpoints and behavior.

```json
{
  "runtime": {
    "rest": {
      "enabled": true,
      "path": "/api",
      "request-body-strict": true
    },
    "graphql": {
      "enabled": true,
      "path": "/graphql",
      "allow-introspection": true
    },
    "mcp": {
      "enabled": true,
      "path": "/mcp"
    },
    "host": {
      "mode": "development",
      "cors": {
        "origins": ["http://localhost:3000"],
        "allow-credentials": false
      },
      "authentication": {
        "provider": "StaticWebApps"
      }
    }
  }
}
```

### Host Modes
- `development` - Detailed errors, introspection enabled
- `production` - Minimal errors, restricted features

### Authentication Providers
- `StaticWebApps` - Azure Static Web Apps authentication
- `AppService` - Azure App Service authentication
- `Simulator` - Local development with mock users

## Entities

Entities represent database objects exposed via the API.

### Entity Types

#### Table Entity
```json
{
  "entities": {
    "Actor": {
      "source": {
        "object": "dbo.Actor",
        "type": "table",
        "key-fields": ["Id"]
      },
      "graphql": {
        "enabled": true,
        "type": {
          "singular": "Actor",
          "plural": "Actors"
        }
      },
      "rest": {
        "enabled": true,
        "path": "/actors"
      },
      "permissions": [...]
    }
  }
}
```

#### View Entity
```json
{
  "entities": {
    "SeriesActors": {
      "source": {
        "object": "dbo.SeriesActors",
        "type": "view",
        "key-fields": ["ActorId"]
      },
      "graphql": { ... },
      "rest": { ... },
      "permissions": [...]
    }
  }
}
```

#### Stored Procedure Entity
```json
{
  "entities": {
    "GetSeriesActors": {
      "source": {
        "object": "dbo.GetSeriesActors",
        "type": "stored-procedure",
        "parameters": {
          "seriesId": "int",
          "top": "int"
        }
      },
      "graphql": {
        "operation": "query",
        "type": {
          "singular": "SeriesActor"
        }
      },
      "rest": {
        "methods": ["POST"]
      },
      "permissions": [...]
    }
  }
}
```

### Source Configuration

#### object
The database object name (schema.name format for SQL Server):
- Tables: `dbo.Actor`
- Views: `dbo.SeriesActors`
- Procedures: `dbo.GetSeriesActors`

#### type
The entity type:
- `table`
- `view`
- `stored-procedure`

#### key-fields
Array of column names that form the primary key:
```json
"key-fields": ["Id"]
"key-fields": ["UserId", "RoleId"]  // Composite key
```

#### parameters (stored procedures only)
Map of parameter names to SQL types:
```json
"parameters": {
  "userId": "int",
  "includeInactive": "bit",
  "searchTerm": "nvarchar(100)"
}
```

### Relationships

Define how entities relate to each other.

#### One-to-Many Relationship
```json
{
  "entities": {
    "Character": {
      "source": { ... },
      "relationships": {
        "Actor": {
          "cardinality": "one",
          "target.entity": "Actor",
          "source.fields": ["ActorId"],
          "target.fields": ["Id"]
        }
      }
    }
  }
}
```

#### Many-to-One Relationship
```json
{
  "entities": {
    "Actor": {
      "source": { ... },
      "relationships": {
        "Characters": {
          "cardinality": "many",
          "target.entity": "Character",
          "source.fields": ["Id"],
          "target.fields": ["ActorId"]
        }
      }
    }
  }
}
```

#### Many-to-Many Relationship (with linking table)
```json
{
  "entities": {
    "Character": {
      "source": { ... },
      "relationships": {
        "Series": {
          "cardinality": "many",
          "target.entity": "Series",
          "source.fields": ["Id"],
          "target.fields": ["Id"],
          "linking.object": "Series_Character",
          "linking.source.fields": ["CharacterId"],
          "linking.target.fields": ["SeriesId"]
        }
      }
    }
  }
}
```

### Permissions

Define role-based access control.

```json
{
  "permissions": [
    {
      "role": "anonymous",
      "actions": ["read"]
    },
    {
      "role": "authenticated",
      "actions": ["create", "read", "update"]
    },
    {
      "role": "admin",
      "actions": ["*"]
    }
  ]
}
```

#### Actions
- `create` - POST operations
- `read` - GET operations
- `update` - PUT/PATCH operations
- `delete` - DELETE operations
- `*` - All actions

#### Fields (column-level permissions)
```json
{
  "permissions": [
    {
      "role": "authenticated",
      "actions": [
        {
          "action": "read",
          "fields": {
            "include": ["*"],
            "exclude": ["PasswordHash", "SecurityToken"]
          }
        },
        {
          "action": "update",
          "fields": {
            "include": ["Name", "Email"],
            "exclude": ["CreatedDate", "Id"]
          }
        }
      ]
    }
  ]
}
```

## Reading Config in Code

### Validate Config Path
```typescript
import { validateConfigPath } from 'dab-vscode-shared/config';

if (validateConfigPath(configPath)) {
    // Config file exists
} else {
    vscode.window.showErrorMessage('Config file not found');
}
```

### Read Entire Config
```typescript
import { readConfig } from 'dab-vscode-shared/config';

const config = readConfig(configPath);
if (config) {
    const dbType = config['data-source']['database-type'];
    const entities = Object.keys(config.entities);
}
```

### Get Connection String
```typescript
import { getConnectionString } from 'dab-vscode-shared/config';

const connString = getConnectionString(configPath);
// Resolves @env() variables from .env file
```

### Get Configured Entities
```typescript
import { getConfiguredEntities } from 'dab-vscode-shared/config';

// Returns Map<string, string> of 'schema.table' -> 'EntityName'
const entities = await getConfiguredEntities(configPath);

// Example: Map {
//   'dbo.actor' => 'Actor',
//   'dbo.character' => 'Character',
//   'dbo.series' => 'Series'
// }
```

## TypeScript Types

The shared package provides TypeScript types for DAB configs:

```typescript
import type { 
    DabConfig,
    DataSource,
    Runtime,
    EntityDefinition,
    EntitySource,
    Relationship,
    Permission
} from 'dab-vscode-shared/types';

const config: DabConfig = readConfig(path);
const entity: EntityDefinition = config.entities['Actor'];
const source: EntitySource = entity.source;
```

## Example: Trek Database Config

```json
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/download/v1.2.10/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('MSSQL_CONNECTION_STRING')"
  },
  "runtime": {
    "rest": { "enabled": true, "path": "/api" },
    "graphql": { "enabled": true, "path": "/graphql" },
    "mcp": { "enabled": true, "path": "/mcp" },
    "host": { "mode": "development" }
  },
  "entities": {
    "Actor": {
      "source": {
        "object": "dbo.Actor",
        "type": "table",
        "key-fields": ["Id"]
      },
      "permissions": [
        { "role": "anonymous", "actions": ["read"] }
      ]
    },
    "Character": {
      "source": {
        "object": "dbo.Character",
        "type": "table",
        "key-fields": ["Id"]
      },
      "relationships": {
        "Actor": {
          "cardinality": "one",
          "target.entity": "Actor",
          "source.fields": ["ActorId"],
          "target.fields": ["Id"]
        },
        "Series": {
          "cardinality": "many",
          "target.entity": "Series",
          "source.fields": ["Id"],
          "target.fields": ["Id"],
          "linking.object": "Series_Character",
          "linking.source.fields": ["CharacterId"],
          "linking.target.fields": ["SeriesId"]
        }
      },
      "permissions": [
        { "role": "anonymous", "actions": ["read"] }
      ]
    },
    "GetSeriesActors": {
      "source": {
        "object": "dbo.GetSeriesActors",
        "type": "stored-procedure",
        "parameters": {
          "seriesId": "int",
          "top": "int"
        }
      },
      "permissions": [
        { "role": "anonymous", "actions": ["execute"] }
      ]
    }
  }
}
```

## Best Practices

### ✅ Do
- Use `@env()` for connection strings (never hardcode)
- Store environment variables in `.env` file
- Add `.env` to `.gitignore`
- Use schema-qualified object names (`dbo.TableName`)
- Define appropriate permissions for each role
- Include key-fields for all tables and views

### ❌ Don't
- Hardcode connection strings in config files
- Commit `.env` files to source control
- Use unqualified table names (`TableName` instead of `dbo.TableName`)
- Give anonymous users write access
- Expose sensitive columns without field-level permissions