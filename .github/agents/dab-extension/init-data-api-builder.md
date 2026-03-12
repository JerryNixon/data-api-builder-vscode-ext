# Init Data API Builder Extension

Guide for how the `init-data-api-builder` VS Code extension works so the agent can read and modify it safely.

## Purpose
- Provide a guided `dab init` workflow from the Explorer folder context menu.
- Create a new DAB config file without overwriting existing ones.
- Capture a connection string into `.env`, keep `.env` git-ignored, and set useful defaults (via shared env utilities).
- Pre-tune REST request-body strictness and optional cache setting.- Automatically configure OpenTelemetry with environment variable placeholders for observability.- Hand off to the “add table” command afterward.

## Activation & Commands
- Contributes command `dabExtension.initDab` and shows it in folder context menu (`explorerResourceIsFolder`).
- No activationEvents; command is lazily loaded on invoke.
- Entry point: [src/extension.ts](../../../init-data-api-builder/src/extension.ts).

## High-Level Flow (extension.ts + utils.ts)
1. Resolve target config path with `resolveConfigPath` (in [src/utils.ts](../../../init-data-api-builder/src/utils.ts)):
  - Starts with `dab-config.json`; if it exists, appends `-2`, `-3`, ... to avoid overwrite.
2. Prompt user via shared `ask(folder)` from `dab-vscode-shared/prompts`:
  - Picks or adds a connection string via shared env helpers.
  - Toggles REST, GraphQL, cache; chooses host mode (dev/prod) and security provider.
  - If no connection is chosen, shows error and exits.
3. Build and run CLI commands with shared `runCommand` (reused terminal):
  - `dab init --database-type mssql --connection-string "@env('<ENV>')" --host-mode <Development|Production> --rest.enabled ... --graphql.enabled ... --auth.provider ... -c <file>`
  - `dab configure --runtime.rest.request-body-strict false -c <file>`
  - Optionally `dab configure --runtime.cache.enabled true -c <file>` when cache is enabled.
  - Configures OpenTelemetry with environment variable placeholders:
    - `dab configure --telemetry.open-telemetry.enabled true -c <file>`
    - `dab configure --telemetry.open-telemetry.endpoint "@env('OTEL_EXPORTER_OTLP_ENDPOINT')" -c <file>`
    - `dab configure --telemetry.open-telemetry.headers "@env('OTEL_EXPORTER_OTLP_HEADERS')" -c <file>`
    - `dab configure --telemetry.open-telemetry.service-name "@env('OTEL_SERVICE_NAME')" -c <file>`
4. Wait ~2 seconds, open the generated config (waits for file), then invoke `dabExtension.addTable` with the config URI.

## Prompts & Defaults (shared prompts)
- Connection selection (shared `ask` + env helpers):
  - Reads `.env` via shared `getConnections` (filters entries containing `server=`).
  - Quick pick lists existing entries (label uses parsed Server/Database when possible) plus an “Enter new” option.
  - If none exist, immediately asks for a new MSSQL connection string and writes it to `.env`.
- Toggles (default Yes): REST, GraphQL, Cache (L1).
- Host mode: Development (default, enables Swagger/Nitro) or Production.
- Security provider: `StaticWebApps` (default) or `Simulated`.
- Return shape: `PromptResult` with `connection`, `enableRest`, `enableGraphQL`, `enableCache`, `hostMode`, `security`.

## .env Management (shared config helpers)
- Uses `dab-vscode-shared/config`:
  - `getConnections` filters for `server=` entries and adds display text.
  - `addConnection` auto-names `MSSQL_CONNECTION_STRING[_N]`, adds `ASPNETCORE_URLS` and `DAB_ENVIRONMENT`, writes `.env`, and ensures `.gitignore` contains `.env`.

## Terminal Usage (shared terminal manager)
- Reuses a terminal named “Data API Builder”; expires after 5s of inactivity or cwd change.
- `runCommand(command, { cwd })` sends text and shows the terminal; recreates when needed.

## Files Touched
- Creates a new `dab-config*.json` in the chosen folder (never overwrites existing names).
- Updates/creates `.env` with connection strings and defaults.
- Updates/creates `.gitignore` to include `.env`.

## External Dependencies & Assumptions
- Relies on global `dab` CLI (`dotnet tool install microsoft.dataapibuilder -g`).
- Assumes the `dabExtension.addTable` command exists (from another extension in the suite) and will be invoked after init.
- Defaults to MSSQL (`--database-type mssql`); no prompts for other providers.

## Editing Guidance (safe changes)
- Keep `resolveConfigPath` behavior (no overwrite; increment suffixes) in `src/utils.ts`.
- Preserve shared `.env` and `.gitignore` safety (do not drop shared `addConnection`/`ensureGitIgnore`).
- Maintain terminal reuse via shared `runCommand` (5s expiry, cwd-aware).
- If adding options to `dab init`/`dab configure`, update `buildInitCommand`/`buildConfigCommand` in `src/utils.ts` and adjust shared prompt flow if needed.
- Treat prompt defaults carefully; they are intentionally permissive (REST/GraphQL/cache on, dev host mode, StaticWebApps security).

## Testing Notes
- Automated: `src/test/extension.test.ts` covers helper utilities (`resolveConfigPath`, `buildInitCommand`, `buildConfigCommand`, `waitForFile`).
- Manual: right-click folder → “DAB Init” → follow prompts → verify config creation, `.env` updates, and terminal commands executed without errors (shared CLI + env helpers).