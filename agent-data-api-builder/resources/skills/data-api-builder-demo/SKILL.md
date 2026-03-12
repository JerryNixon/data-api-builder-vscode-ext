---
name: data-api-builder-demo
description: Build and maintain DAB quickstart demos with consistent structure, naming, deployment scripts, and validation checks.
---

# Data API Builder Demo Operations

Use this skill to keep quickstarts **consistent, runnable, and demo-ready**.

## When to use

- Create a new quickstart
- Rename folders/files across quickstarts
- Validate demo readiness before PR/presentation
- Enforce repo conventions for Azure + MCP registry + reset workflow

## Canonical quickstart shape

Each `quickstart<N>/` should include:
- `aspire-apphost/`
- `data-api/`
- `database/`
- `mcp-inspector/`
- `web-app/`
- `azure-infra/`
- `README.md`, `azure.yaml`, `<quickstart>.sln`

## Naming standards

- Folders are lowercase with hyphens
- Use `azure-up.ps1` / `azure-down.ps1` in `azure-infra/`
- Avoid legacy `aspire-up.ps1`/`aspire-down.ps1`

## Critical repo standards

1. `.gitignore` must include:
   - `.env`
   - `**/bin`
   - `**/obj`
2. Azure tags must include `owner`.
3. Azure token format: UTC `yyyyMMddHHmm`.
4. MCP registry for Azure quickstarts is repo-root `.github/mcp.json`.
5. `reset.ps1` should remove temporary deployment artifacts and quickstart MCP entries only.

## Rename workflow

1. Rename folder/file.
2. Update references in:
   - `*.sln`
   - `azure.yaml`
   - `aspire-apphost/*.csproj`
   - `aspire-apphost/Program.cs`
   - `azure-infra/*.ps1`
3. Delete `bin/` + `obj/` caches.
4. Rebuild and revalidate.

## Troubleshooting (syntax gotchas)

### `.gitignore` glob correctness

```gitignore
# WRONG (root-only)
bin/
obj/

# CORRECT (all nested projects)
**/bin
**/obj
```

### Azure script names

Use only:
- `azure-up.ps1`
- `azure-down.ps1`

Avoid legacy `aspire-up.ps1` / `aspire-down.ps1` references in docs/scripts.

### MCP registry key format

Use deterministic quickstart keys (example):

```json
"azure-sql-mcp-qs3": { "type": "http", "url": "https://<dab-fqdn>/mcp" }
```

## Demo validation checklist

- Build succeeds for target quickstart.
- Expected folders/files exist.
- No stale folder references remain.
- README auth matrix/diagrams match implementation.
- Azure scripts use standard names and env variables.
- `.github/mcp.json` updates are additive and scoped.

## Decision points

- **Local orchestration?** Use Aspire or Docker skill; keep quickstart structure unchanged.
- **Azure deployment?** Keep infra in `azure-infra/` and enforce owner/token rules.
- **Schema changes?** Source of truth is `database/` SQL project.

## Completion checks

- Quickstart is self-contained and deployable.
- Naming and script conventions are intact.
- Cross-quickstart structure remains consistent.

## Related skills

- `aspire-data-api-builder`
- `docker-data-api-builder`
- `azure-data-api-builder`
- `data-api-builder-config`
- `data-api-builder-cli`
- `data-api-builder-mcp`
