# DAB CLI Reference

Authoritative reference for the Data API builder CLI commands used by the extensions. All options are taken from the official docs and map directly to the runtime config schema.

## General Notes
- Default config name is `dab-config.json`. If `DAB_ENVIRONMENT` is set, the CLI prefers `dab-config.<DAB_ENVIRONMENT>.json` when reading (for `configure` and other commands).
- `dab init` **overwrites** the target file; there is no merge. Use version control to keep previous configs.
- Prefer the `--*.enabled` flags instead of the deprecated `--*.disabled` flags. Do not mix them in the same command.
- Some options (entity descriptions, parameters.* metadata) are available only in the v1.7 prerelease CLI (`dotnet tool install microsoft.dataapibuilder --prerelease`).

## `dab init`
Initialize a new config file.

**Syntax:** `dab init [options]`

**Key options**
- `-c, --config <path>`: Output file name (default `dab-config.json`).
- Data source: `--database-type <mssql|postgresql|mysql|cosmosdb_postgresql|cosmosdb_nosql>`, `--connection-string <value>`, `--cosmosdb_nosql-database`, `--cosmosdb_nosql-container`, `--graphql-schema <path>` (required for cosmosdb_nosql), `--set-session-context <true|false>` (mssql only).
- REST: `--rest.enabled <true|false>`, `--rest.path </api>`, `--rest.request-body-strict <true|false>`. Deprecated: `--rest.disabled`.
- GraphQL: `--graphql.enabled <true|false>`, `--graphql.path </graphql>`, `--graphql.allow-introspection <true|false>`, `--graphql.multiple-create.enabled <true|false>`. Deprecated: `--graphql.disabled`.
- MCP: `--mcp.enabled <true|false>`, `--mcp.path </mcp>`. Deprecated: `--mcp.disabled`.
- Host/auth: `--host-mode <Development|Production>`, `--cors-origin <comma-separated origins>`, `--runtime.base-route </prefix>`, `--auth.provider`, `--auth.audience`, `--auth.issuer`.

**Behavior**
- Generates `data-source`, `runtime` (REST/GraphQL/MCP/host), and empty `entities`.
- Overwrites existing file completely; no merge.

## `dab add <entity-name>`
Add a new entity to an existing config (config must already exist from `init`).

**Syntax:** `dab add <entity-name> [options]`

**Required**
- `<entity-name>`: Logical name (case-sensitive) for the `entities` section.
- `--permissions "role:actions"`: At least one role/action pair. Option is single-use; add more roles with `dab update`.
- `--source <schema.object>`: Database object name.

**Source options**
- `--source.type <table|view|stored-procedure>` (default `table`).
- `--source.key-fields <a,b>`: Required for views (or tables without inferred PK).
- Stored procedures: `--source.params "name:value,..."` (deprecated in v1.7), or `--parameters.name/description/required/default` (v1.7 prerelease).

**Exposure**
- REST: `--rest <true|false|customPath>`, `--rest.methods <verbs>` (stored procedures only; replaces list).
- GraphQL: `--graphql <false|true|singular|singular:plural>`, `--graphql.operation <query|mutation>` (stored procedures only; default `mutation`).

**Policies and fields**
- Policies: `--policy-database <odata filter>`, `--policy-request <pre-DB policy>`.
- Field filters: `--fields.include <comma list|*>`, `--fields.exclude <comma list>`.
- Field metadata (v1.7 prerelease): `--fields.name`, `--fields.alias`, `--fields.description`, `--fields.primary-key` (comma-aligned lists).

**Caching**
- `--cache.enabled <true|false>`, `--cache.ttl <seconds>`.

**Description**
- `--description <text>` (v1.7 prerelease) writes `entities.<name>.description`.

**Examples**
- Table: `dab add Book --source dbo.Books --permissions "anonymous:read"`
- View with keys: `dab add BookView --source dbo.MyView --source.type view --source.key-fields "id,region" --permissions "anonymous:read"`
- Stored proc: `dab add GetBookById --source dbo.GetBookById --source.type stored-procedure --permissions "anonymous:*" --rest "GetBookById" --rest.methods "GET"`

**Critical: Stored Procedure Patterns**

When working with stored procedures, follow these patterns to avoid CLI errors:

1. **DO NOT use `--source.params` during `dab add`**
   - DAB automatically introspects stored procedure parameters from the database
   - Providing `--source.params` in the wrong format causes "Invalid format for --source.params" errors
   - Exception: Only use `--source.params` if you need to override default parameter values (advanced scenario)

2. **Strip brackets from entity names**
   - Source can have brackets: `--source [dbo].[GetSpecialActor]`
   - Entity name should NOT: `dab add GetSpecialActor` (not `[GetSpecialActor]`)

3. **Default to GET method for stored procedures**
   - Use `--rest.methods "GET"` for most read-only stored procedures
   - Use `--rest.methods "POST"` only for data-modifying procedures
   - Avoid `--rest.methods "GET, POST"` unless specifically needed

4. **Add parameter metadata separately with `dab update`**
   - After `dab add`, use `dab update` to add parameter descriptions
   - Example: `dab update GetBookById --parameters.name "bookId" --parameters.description "bookId (int)"`
   - Call once per parameter with `--parameters.name` and `--parameters.description`

5. **Add field metadata for result columns**
   - Use `dab update` with `--fields.name` and `--fields.description` for each result column
   - Example: `dab update GetBookById --fields.name "Title" --fields.description "Title result column"`
   - Call once per field returned by the stored procedure

6. **DO NOT use `--map` for stored procedures**
   - `--map` is for tables and views only, not stored procedures
   - DAB auto-discovers result columns from stored procedure execution metadata
   - Field descriptions should use `--fields.name` and `--fields.description` instead

**Complete stored procedure workflow example:**
```bash
# Step 1: Add the stored procedure entity (DAB auto-discovers parameters)
dab add GetSpecialActor -c "dab-config.json" --source [dbo].[GetSpecialActor] --source.type "stored-procedure" --permissions "anonymous:*" --rest "GetSpecialActor" --rest.methods "GET"

# Step 2: Add descriptions for each parameter
dab update GetSpecialActor -c "dab-config.json" --parameters.name "Special1" --parameters.description "Special1 (int)"
dab update GetSpecialActor -c "dab-config.json" --parameters.name "Special2" --parameters.description "Special2 (varchar)"

# Step 3: Add descriptions for each result column/field
dab update GetSpecialActor -c "dab-config.json" --fields.name "ActorId" --fields.description "ActorId result column"
dab update GetSpecialActor -c "dab-config.json" --fields.name "Name" --fields.description "Name result column"
dab update GetSpecialActor -c "dab-config.json" --fields.name "Special" --fields.description "Special result column"
```

## `dab update <entity-name>`
Update an existing entity definition (use `add` for creation).

**Syntax:** `dab update <entity-name> [options]`

**Source and parameters**
- `-c, --config <path>`: Config file path.
- `-s, --source <schema.object>`: Replace the underlying object.
- `--source.type <table|view|stored-procedure>`; `--source.key-fields <a,b>` (views/non-PK tables only); `--source.params "name:value,..."` (stored procedures only; deprecated in v1.7).
- Stored procedure parameters (v1.7 prerelease): `--parameters.name`, `--parameters.description`, `--parameters.required`, `--parameters.default` (comma-aligned lists).

**Exposure**
- REST: `--rest <true|false|customPath>`, `--rest.methods <verbs>` (stored procedures only; replaces list).
- GraphQL: `--graphql <false|true|singular|singular:plural>`, `--graphql.operation <query|mutation>` (stored procedures only; default `mutation`).

**Caching & description**
- `--cache.enabled <true|false>`, `--cache.ttl <seconds>`.
- `--description <text>` (v1.7 prerelease).

**Permissions & policies**
- `--permissions "role:actions"`: Adds or updates a single role; run multiple times for multiple roles.
- `--policy-database <odata filter>`, `--policy-request <pre-DB policy>`.

**Fields & mappings**
- Field filters: `--fields.include`, `--fields.exclude` (replaces include list).
- Field metadata (v1.7 prerelease): `--fields.name`, `--fields.alias`, `--fields.description`, `--fields.primary-key`.
- Field mappings: `-m, --map "dbName:alias,..."` replaces the entire mapping set.

**Relationships**
- `--relationship <name>`: Select relationship to create/update.
- With `--relationship`: use `--cardinality <one|many>`, `--target.entity <name>`, `--relationship.fields "source:target"` for direct relationships.
- Many-to-many: include `--linking.object`, `--linking.source.fields <a,b>`, `--linking.target.fields <a,b>`.

## `dab configure`
Configure non-entity settings. Does **not** change the `entities` section.

**Syntax:** `dab configure [options]`

**Behavior**
- All-or-nothing: if any option is invalid, no changes are written.
- Leaves unspecified settings unchanged.

**Config path**
- `-c, --config <path>`: Defaults to `dab-config.json` (or `dab-config.<DAB_ENVIRONMENT>.json` if that file exists).

**Data source**
- `--data-source.database-type <MSSQL|PostgreSQL|CosmosDB_NoSQL|MySQL>`
- `--data-source.connection-string <value>`
- Cosmos NoSQL: `--data-source.options.database`, `--data-source.options.container`, `--data-source.options.schema`
- MSSQL: `--data-source.options.set-session-context <true|false>`

**Runtime**
- GraphQL: `--runtime.graphql.enabled`, `--runtime.graphql.path`, `--runtime.graphql.depth-limit`, `--runtime.graphql.allow-introspection`, `--runtime.graphql.multiple-mutations.create.enabled`
- REST: `--runtime.rest.enabled`, `--runtime.rest.path`, `--runtime.rest.request-body-strict`
- MCP: `--runtime.mcp.enabled`, `--runtime.mcp.path`, `--runtime.mcp.dml-tools.enabled`, and per-tool toggles `--runtime.mcp.dml-tools.describe-entities.enabled`, `--runtime.mcp.dml-tools.create-record.enabled`, `--runtime.mcp.dml-tools.read-records.enabled`, `--runtime.mcp.dml-tools.update-record.enabled`, `--runtime.mcp.dml-tools.delete-record.enabled`, `--runtime.mcp.dml-tools.execute-entity.enabled`
- Cache: `--runtime.cache.enabled`, `--runtime.cache.ttl-seconds`
- Host: `--runtime.host.mode <Development|Production>`, `--runtime.host.cors.origins <space-separated list>`, `--runtime.host.cors.allow-credentials <true|false>`, `--runtime.host.authentication.provider`, `--runtime.host.authentication.jwt.audience`, `--runtime.host.authentication.jwt.issuer`

**Azure Key Vault**
- `--azure-key-vault.endpoint <url>`
- Retry policy: `--azure-key-vault.retry-policy.mode <fixed|exponential>`, `--azure-key-vault.retry-policy.max-count`, `--azure-key-vault.retry-policy.delay-seconds`, `--azure-key-vault.retry-policy.max-delay-seconds`, `--azure-key-vault.retry-policy.network-timeout-seconds`

**Telemetry**
- Azure Log Analytics: `--runtime.telemetry.azure-log-analytics.enabled`, `--runtime.telemetry.azure-log-analytics.dab-identifier`, `--runtime.telemetry.azure-log-analytics.flush-interval-seconds`, `--runtime.telemetry.azure-log-analytics.auth.custom-table-name`, `--runtime.telemetry.azure-log-analytics.auth.dcr-immutable-id`, `--runtime.telemetry.azure-log-analytics.auth.dce-endpoint`
- File sink: `--runtime.telemetry.file.enabled`, `--runtime.telemetry.file.path`, `--runtime.telemetry.file.rolling-interval`, `--runtime.telemetry.file.retained-file-count-limit`, `--runtime.telemetry.file.file-size-limit-bytes`

## `dab start`
Start the Data API builder engine with a specified configuration file.

**Syntax:** `dab start [options]`

**Key options**
- `-c, --config <path>`: Config file to use (default `dab-config.json` or `dab-config.<DAB_ENVIRONMENT>.json` if `DAB_ENVIRONMENT` is set).
- `--verbose`: Enable detailed logging output.
- `--LogLevel <level>`: Set logging level (Trace, Debug, Information, Warning, Error, Critical).
- `--no-https-redirect`: Disable automatic HTTPS redirection (useful for local development).

**Behavior**
- Reads the configuration file and starts the DAB engine as a web server.
- By default, listens on `http://localhost:5000` (development mode) or configured host.
- REST endpoint available at configured path (default `/api`).
- GraphQL endpoint available at configured path (default `/graphql`).
- MCP endpoint available at configured path (default `/mcp`).
- Health check endpoint available at `/health` (if enabled).
- Press Ctrl+C to stop the server.

**Environment-specific configs**
If `DAB_ENVIRONMENT=Production` is set and `dab-config.Production.json` exists, DAB will use that file instead of `dab-config.json`.

**Examples**
- Start with default config: `dab start`
- Start with specific config: `dab start --config dab-config.Development.json`
- Start with verbose logging: `dab start --verbose`
- Start with custom log level: `dab start --LogLevel Debug`

**Common Issues**
- **Port already in use**: Another process is using port 5000. Stop the other process or configure a different port in your config.
- **Connection string error**: Ensure environment variables are set correctly if using `@env('VAR_NAME')` syntax.
- **Authentication errors**: Verify `runtime.host.authentication` settings match your auth provider configuration.

## `dab validate`
Validate a DAB configuration file for correctness and schema compliance.

**Syntax:** `dab validate [options]`

**Key options**
- `-c, --config <path>`: Config file to validate (default `dab-config.json`).

**Behavior**
- Checks the configuration file against the JSON schema.
- Validates data source connection settings (without actually connecting).
- Verifies entity definitions for required fields and valid syntax.
- Checks permission configurations for valid roles and actions.
- Validates relationship definitions for proper cardinality and field mappings.
- Returns exit code 0 if valid, non-zero if validation fails.

**Validation Stages**
1. **Schema validation**: Ensures JSON structure matches the DAB schema.
2. **Semantic validation**: Checks logical consistency (e.g., relationship targets exist).
3. **Configuration validation**: Verifies runtime settings are compatible with database type.
4. **Security validation**: Ensures permissions are properly configured.

**Examples**
- Validate default config: `dab validate`
- Validate specific config: `dab validate --config dab-config.Production.json`
- Use in CI/CD pipeline: `dab validate && dab start`

**Common Validation Errors**
- **Missing required fields**: Entities must have `source`, `permissions`, etc.
- **Invalid relationship target**: Referenced entity doesn't exist in config.
- **Invalid database type**: Unsupported or misspelled database type.
- **Permission action mismatch**: Using `execute` action on non-stored-procedure entities.
- **Missing key-fields**: Views require explicit key field definitions.
- **Invalid GraphQL types**: Singular/plural names must follow GraphQL naming rules.

**Best Practices**
- Run `dab validate` before committing config changes to version control.
- Include validation in CI/CD pipelines to catch config errors early.
- Use with `--config` to validate environment-specific configs separately.
- Combine with schema reference in IDE for real-time validation during editing.

## Schema Reference
- Full schema: [dab.draft.schema.json](dab.draft.schema.json)
- Use schema defaults and enums when validating CLI output.