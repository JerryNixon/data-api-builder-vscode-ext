---
name: dab-extension-shared-architecture
description: "Use when refactoring DAB VS Code extensions to shared packages, reducing duplicate code, choosing dependencies, or keeping extension bundles small."
license: MIT
---

# DAB Extension Shared Architecture

## Use when

- Moving logic from a child extension into `shared/` or `shared-database/`.
- Auditing duplicated utilities across extensions.
- Deciding whether a helper belongs in an extension or shared package.
- Keeping VSIX output small while preserving runtime dependencies.

## Shared package model

- `shared/` publishes `dab-vscode-shared` for lightweight utilities used by many or future extensions.
- `shared-database/` publishes `dab-vscode-shared-database` for SQL/database utilities and depends on `mssql`.
- Prefer `shared/` for generic config, terminal, prompt, path, validation, and type helpers.
- Use `shared-database/` only for database connectivity, metadata queries, and SQL-specific types.
- If a helper can be generic and useful to another or future extension, move it to shared even if only one extension needs it today.

## Dependency rules

- All child extensions may depend on `dab-vscode-shared` when they need shared utilities.
- Only database-querying extensions should depend on `dab-vscode-shared-database`.
- Keep lightweight extensions out of `shared-database` to avoid shipping database driver weight unnecessarily.
- Check each extension's `package.json` before adding dependencies; existing manifests use both `*` and `file:../shared` patterns, so preserve local convention unless standardizing deliberately.

## Refactor workflow

1. Search for duplicate utilities in child extension `src/` folders.
2. Check `shared/src/index.ts` and `shared-database/src/index.ts` for existing exports before adding new ones.
3. Move generic logic into the appropriate shared package with tests.
4. Export the new API from the shared package entry point.
5. Update child extension imports to use `dab-vscode-shared/...` or `dab-vscode-shared-database/...`.
6. Delete stale local duplicate code after the extension builds.
7. Run shared package tests and the affected extension build.

## Common duplication targets

- Terminal command helpers should live under `dab-vscode-shared/terminal`.
- DAB config reading and path validation should live under `dab-vscode-shared/config`.
- Environment variable helpers should live under `dab-vscode-shared/config` or another shared module.
- MSSQL connection and metadata helpers should live under `dab-vscode-shared-database`.

## VS Code API boundary

- Keep pure logic testable without importing `vscode`.
- Keep VS Code API integration in extension entry points or thin adapters.
- Do not move extension-specific command registration into shared packages.

## Completion checks

- Shared code has tests when behavior changed.
- Duplicate child-extension code was removed.
- Affected extension still builds and imports shared code correctly.
- No lightweight extension gained avoidable database dependencies.