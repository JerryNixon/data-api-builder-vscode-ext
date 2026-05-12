---
name: dab-extension-debug-test-workflow
description: "Use when changing VS Code launch tasks, F5 debugging, extension host testing, shared package tests, or fast single-extension validation for DAB extensions."
license: MIT
---

# DAB Extension Debug and Test Workflow

## Use when

- Updating `.vscode/launch.json` or `.vscode/tasks.json`.
- Debugging all extensions together in the Extension Development Host.
- Debugging one extension quickly without a full monorepo build.
- Deciding which tests to run after a change.

## Debug expectations

- Keep `Omnibus Extension` available as the first/default F5 target for quick extension-pack smoke testing.
- Keep `🚀 All DAB Extensions` available for loading every child extension at once.
- Keep one standalone debug configuration per child extension for fast focused work.
- The all-extension debug configuration must include every child extension development path plus Omnibus.
- Standalone child-extension debug configurations should use only that extension's build task.

## Current root tasks to preserve

- `Build All Extensions` runs the root full build.
- `Build <Name> Extension` tasks build individual child extensions.
- `Test Shared (Full)` runs root shared tests.
- Shared package direct tests live under `shared/` and `shared-database/`.

## Test selection

1. Shared code changed:
   - Run `npm run test:shared`.
   - Run `npm run test:shared-database` if database shared code changed.
   - Run affected extension builds.
2. One child extension changed:
   - Run that extension's build task or npm build script.
   - Run its tests if present.
   - Use its standalone F5 debug configuration.
3. Cross-cutting build/debug changes:
   - Run `Build All Extensions` when practical.
   - Use `🚀 All DAB Extensions` in the Extension Development Host.

## VS Code API testing rule

- Node/Mocha tests cannot import the `vscode` module directly.
- Extract pure functions into utility modules for unit tests.
- Validate VS Code API behavior in the Extension Development Host.

## Completion checks

- F5 default remains Omnibus unless intentionally changed.
- All-extension launch includes every child extension and Omnibus.
- Single-extension launch remains fast and does not depend on full monorepo build.
- Tests/builds run match the scope of the change.