# DAB Developer Agent Scripts

This folder contains reference scripts for the DAB Developer Agent to use when helping users with deployment and automation tasks.

## Purpose

These scripts serve as:

1. **Complete Working Examples** - Users can run them directly if they have the required tools
2. **Snippet Sources** - The agent can extract specific sections to answer targeted questions  
3. **Adaptation Guides** - Commands can be converted to other shells, CI/CD pipelines, or IaC templates
4. **Troubleshooting References** - Patterns and error handling for common deployment scenarios

## Important Notes

- **PowerShell is NOT required** - These scripts use PowerShell syntax for cross-platform compatibility, but all Azure CLI commands work identically in Bash/Zsh
- **Scripts are guides, not mandates** - Users should adapt them to their environment and security requirements
- **Always validate** - Users should review and modify variables (especially passwords and resource names) before execution

## Available Scripts

### deploy-dab-aca-sample.ps1

**Simple, educational deployment script** - Good for learning and quick demos.

Complete end-to-end deployment of Data API Builder to Azure Container Apps using SQL authentication.

**What it creates:**
- Azure Resource Group
- Azure SQL Server + Database with sample data
- Azure Container Registry
- Container Apps Environment
- Container App running DAB

**Prerequisites:**
- Azure CLI (`az`)
- DAB CLI (`dab`)
- SQLCMD (optional, for database schema creation)
- Active Azure subscription

**Key Sections for Agent Reference:**
- Lines 1-35: Purpose and prerequisites documentation
- Lines 37-58: Variable definitions (adapt for user's naming conventions)
- Lines 60-80: Azure authentication
- Lines 82-115: Prerequisites validation
- Lines 117-145: Resource group creation with uniqueness check
- Lines 147-200: Azure SQL Database setup
- Lines 202-250: Database schema creation
- Lines 252-280: Container Registry setup
- Lines 282-340: Docker image build
- Lines 342-400: Container Apps deployment
- Lines 402-450: Health verification and output

---

### deploy-dab-aca-production.ps1

**Production-grade deployment script** - Recommended for enterprise deployments.

Comprehensive deployment with Azure AD-only authentication, managed identity, retry logic, and automatic cleanup.

**Key Features:**
- Azure AD-only authentication (no SQL passwords)
- Managed Identity for container-to-database connectivity
- Automatic retry logic with exponential backoff
- Resource name validation and sanitization
- Comprehensive logging to file
- Automatic cleanup on failure (optional)
- SQL Commander deployment for database management

**What it creates:**
- Azure Resource Group with tags
- Azure SQL Server (Azure AD-only auth)
- Azure SQL Database (tries free tier first)
- Azure Container Registry
- Log Analytics Workspace
- Container Apps Environment
- Container App with system-assigned managed identity
- SQL Commander (optional) for database management

**Prerequisites:**
- Azure CLI (`az`)
- DAB CLI (`dab`) v1.7.81-rc or later
- SQLCMD with Azure AD support
- Active Azure subscription
- `database.sql` - Your database schema
- `dab-config.json` - Using `@env('MSSQL_CONNECTION_STRING')`
- `Dockerfile` - See Dockerfile.sample

**Parameters:**
```powershell
-Region              # Azure region (default: westus2)
-DatabasePath        # Path to SQL schema file (default: ./database.sql)
-ConfigPath          # Path to DAB config (default: ./dab-config.json)
-ResourceGroupName   # Custom resource group name
-SqlServerName       # Custom SQL server name
-SqlDatabaseName     # Custom database name
-ContainerAppName    # Custom container app name
-AcrName             # Custom ACR name
-NoSqlCommander      # Skip SQL Commander deployment
-NoCleanup           # Preserve resources on failure for debugging
```

**Key Sections for Agent Reference:**
- Lines 1-60: Comprehensive documentation header
- Lines 62-100: Parameter definitions
- Lines 102-150: Script configuration and constants
- Lines 152-350: Helper functions (Invoke-RetryOperation, Get-MI-DisplayName, Assert-AzureResourceName)
- Lines 352-400: Prerequisites validation
- Lines 402-450: Azure authentication and subscription selection
- Lines 452-500: Resource naming and sanitization
- Lines 502-700: Main deployment logic with retry handling
- Lines 702-800: Managed identity SQL access grants
- Lines 802-900: Health verification and summary output

---

### Dockerfile.sample

**Reference Dockerfile** for containerizing Data API Builder with baked configuration.

**Key Features:**
- Uses official DAB base image from Microsoft Container Registry
- Accepts DAB version as build argument
- OCI-compliant image labels
- Read-only config file for security
- Documentation for health check configuration
- Comments explaining connection string options

**Usage:**
```bash
# Build locally
docker build --build-arg DAB_VERSION=1.2.10 -t dab-api:latest .

# Build with Azure Container Registry
az acr build --registry myacr --image dab-api:v1 --build-arg DAB_VERSION=1.2.10 .

# Run locally
docker run -p 5000:5000 -e MSSQL_CONNECTION_STRING="..." dab-api:latest
```

## Cross-Platform Command Translation

| PowerShell | Bash/Zsh |
|------------|----------|
| `$VARIABLE = "value"` | `VARIABLE="value"` |
| `` `(backtick for line continuation) `` | `\` (backslash) |
| `$(Get-Random -Minimum 1000 -Maximum 9999)` | `$((RANDOM % 9000 + 1000))` |
| `Write-Host "text" -ForegroundColor Green` | `echo -e "\033[32mtext\033[0m"` |
| `Invoke-RestMethod -Uri $url` | `curl -s $url` |
| `Test-Path "file.json"` | `[ -f "file.json" ]` |

## Security Considerations

These scripts use SQL authentication for simplicity. For production deployments, consider:

1. **Managed Identity** - Preferred for Azure SQL (passwordless)
2. **Key Vault** - Store secrets in Azure Key Vault
3. **Private Endpoints** - Use VNet integration for database access
4. **RBAC** - Use Azure AD authentication where possible
