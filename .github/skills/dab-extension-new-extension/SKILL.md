---
name: dab-extension-new-extension
description: "Use when creating a new DAB VS Code sub-extension, inferring folder names, wiring Omnibus, webpack, launch tasks, package.bat, tests, and version 1.0.0."
license: MIT
---

# DAB New Extension Workflow

## Use when

- Creating a new Data API Builder VS Code sub-extension.
- Adding a new extension to the Omnibus pack.
- Wiring a new extension into workspace builds, debug targets, tests, and packaging.

## Required question

Before creating files, ask the user for the extension name or feature name.

Infer the folder from the answer using the existing pattern:

- User feature name: `Foo`
- Folder: `foo-data-api-builder`
- Extension name: `foo-data-api-builder`
- Marketplace ID: `jerry-nixon.foo-data-api-builder`
- Starting version: `1.0.0`

Confirm inferred names if there is ambiguity, a collision, or a Marketplace ID concern.

## Required structure

Create a folder like existing extensions:

- `src/extension.ts` for activation and command registration.
- Pure utility modules for testable logic.
- `package.json` manifest with commands, activation events, version `1.0.0`, publisher, icon, and scripts.
- `webpack.config.js` unless intentionally copying a non-webpack extension pattern.
- `tsconfig.json`, `eslint.config.mjs`, `README.md`, `LICENSE.txt`, `images/icon.png`.
- Tests for pure logic where behavior exists.

## Required wiring

Update every relevant root integration point:

1. Root `package.json`:
   - Add the new folder to `workspaces`.
   - Add `build:<name>`.
   - Add it to `build:all-extensions`.
2. `omnibus-data-api-builder/package.json`:
   - Add `jerry-nixon.<extension-name>` to `extensionPack`.
   - Do not bump Omnibus version unless Omnibus metadata beyond the pack entry changed intentionally.
3. `package.bat`:
   - Add a menu option.
   - Add a per-extension `:RUN` mapping.
   - Add it to `:RUN_ALL`.
4. `.vscode/launch.json`:
   - Add the extension development path to `🚀 All DAB Extensions`.
   - Add a standalone debug configuration.
5. `.vscode/tasks.json`:
   - Add a single-extension build task.

## Shared-code expectation

- Use `dab-vscode-shared` for generic helpers.
- Use `dab-vscode-shared-database` only if the extension queries databases.
- If new logic can be generic for a future extension, put it in `shared/` or `shared-database/` with tests instead of hiding it in the new child extension.

## Completion checks

- New extension starts at version `1.0.0`.
- Omnibus includes the new extension ID.
- Root build, package script, debug launch, and tasks know about the new extension.
- At least one relevant test exists for non-trivial logic.
- Build artifacts are ignored and not committed.