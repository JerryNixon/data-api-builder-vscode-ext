# Deployment Script Generation for Azure Container Apps

When a user asks to deploy to Azure, generate an **Azure Developer CLI (azd) template** for repeatable deployments.

## Why AZD?

- **Single command**: `azd up` deploys everything
- **Single command**: `azd down` tears down everything  
- **Cross-platform**: Windows, macOS, Linux
- **Minimal deps**: Just `azd` - https://aka.ms/install-azd
- **Infrastructure as Code**: Bicep templates included
- **Environment management**: Dev, staging, prod configs

## AZD Template Structure

Generate this folder structure:

```
project/
├── azure.yaml              # AZD project definition
├── infra/
│   ├── main.bicep          # Main infrastructure
│   ├── main.parameters.json
│   └── abbreviations.json
├── dab-config.json         # DAB configuration
├── Dockerfile              # Container definition
└── .env                    # Local connection string (gitignored)
```

## File Templates

### azure.yaml

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/Azure/azure-dev/main/schemas/v1.0/azure.yaml.json
name: dab-api
metadata:
  template: dab-container-apps
services:
  api:
    project: .
    host: containerapp
    language: dotnet
```

### infra/main.bicep

```bicep
targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, staging, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@secure()
@description('SQL Server connection string')
param databaseConnectionString string

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// Container Registry
module acr 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'acr'
  scope: rg
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    acrSku: 'Basic'
    tags: tags
  }
}

// Log Analytics
module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.3.4' = {
  name: 'logAnalytics'
  scope: rg
  params: {
    name: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    location: location
    tags: tags
  }
}

// Container Apps Environment
module containerAppsEnv 'br/public:avm/res/app/managed-environment:0.4.5' = {
  name: 'containerAppsEnv'
  scope: rg
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    logAnalyticsWorkspaceResourceId: logAnalytics.outputs.resourceId
    tags: tags
  }
}

// Container App
module containerApp 'br/public:avm/res/app/container-app:0.4.1' = {
  name: 'containerApp'
  scope: rg
  params: {
    name: '${abbrs.appContainerApps}${resourceToken}'
    location: location
    environmentId: containerAppsEnv.outputs.resourceId
    containers: [
      {
        name: 'dab-api'
        image: 'mcr.microsoft.com/azure-databases/data-api-builder:latest'
        resources: {
          cpu: json('0.5')
          memory: '1Gi'
        }
        env: [
          {
            name: 'MSSQL_CONNECTION_STRING'
            secretRef: 'db-connection-string'
          }
        ]
      }
    ]
    secrets: {
      secureList: [
        {
          name: 'db-connection-string'
          value: databaseConnectionString
        }
      ]
    }
    ingressExternal: true
    ingressTargetPort: 5000
    registries: [
      {
        server: acr.outputs.loginServer
        identity: 'system'
      }
    ]
    managedIdentities: {
      systemAssigned: true
    }
    tags: tags
  }
}

// Grant ACR pull to Container App
module acrPullRole 'br/public:avm/ptn/authorization/resource-role-assignment:0.1.1' = {
  name: 'acrPullRole'
  scope: rg
  params: {
    principalId: containerApp.outputs.systemAssignedMIPrincipalId
    resourceId: acr.outputs.resourceId
    roleDefinitionId: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull
  }
}

output AZURE_CONTAINER_APP_FQDN string = containerApp.outputs.fqdn
output AZURE_RESOURCE_GROUP string = rg.name
```

### infra/main.parameters.json

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environmentName": {
      "value": "${AZURE_ENV_NAME}"
    },
    "location": {
      "value": "${AZURE_LOCATION}"
    },
    "databaseConnectionString": {
      "value": "${DATABASE_CONNECTION_STRING}"
    }
  }
}
```

### infra/abbreviations.json

```json
{
  "resourcesResourceGroups": "rg-",
  "containerRegistryRegistries": "cr",
  "operationalInsightsWorkspaces": "log-",
  "appManagedEnvironments": "cae-",
  "appContainerApps": "ca-"
}
```

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/azure-databases/data-api-builder:latest
COPY dab-config.json /App/dab-config.json
EXPOSE 5000
```

## Agent Behavior

When user asks "deploy to Azure":

1. **Generate AZD template** (all files above)
2. **Show simple instructions:**

```
I've created an Azure Developer CLI template for deployment.

📁 Files created:
├── azure.yaml
├── infra/main.bicep
├── infra/main.parameters.json
├── infra/abbreviations.json
└── Dockerfile

🚀 To deploy:

1. Install AZD (one-time): https://aka.ms/install-azd
   - Windows: winget install microsoft.azd
   - macOS: brew install azd
   - Linux: curl -fsSL https://aka.ms/install-azd.sh | bash

2. Set your database connection string:
   azd env set DATABASE_CONNECTION_STRING "Server=...;Database=...;..."

3. Deploy everything:
   azd up

4. When done, tear down:
   azd down

That's it! AZD handles resource group, container registry, 
container app, networking, and secrets automatically.
```

## Commands Reference

| Action | Command |
|--------|---------|
| First-time setup | `azd init` (already done) |
| Set environment variable | `azd env set KEY value` |
| Deploy everything | `azd up` |
| Deploy infra only | `azd provision` |
| Deploy code only | `azd deploy` |
| View deployed URLs | `azd show` |
| Tear down everything | `azd down` |
| Switch environments | `azd env select prod` |

## Multiple Environments

```bash
# Create dev environment
azd env new dev
azd env set DATABASE_CONNECTION_STRING "Server=dev-server..."
azd up

# Create prod environment  
azd env new prod
azd env set DATABASE_CONNECTION_STRING "Server=prod-server..."
azd up

# Switch between them
azd env select dev
azd env select prod
```

## Why AZD Instead of Shell Scripts?

| Approach | Pros | Cons |
|----------|------|------|
| **Azure Developer CLI (azd)** | Cross-platform, repeatable, environment management, single tool | Requires azd install |
| Shell Scripts (PowerShell/Bash) | No dependencies beyond Azure CLI | Platform-specific, harder to maintain, error-prone |

**We use AZD** because it provides:
- **One command** to deploy: `azd up`
- **One command** to teardown: `azd down`
- **Environment management** for dev/staging/prod
- **Bicep templates** for Infrastructure as Code
- **Cross-platform** compatibility
