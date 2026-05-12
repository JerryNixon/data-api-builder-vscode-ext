---
name: dab-extension-release-workflow
description: "Use when modifying DAB VS Code extension versions, package manifests, Omnibus extension pack entries, package.bat packaging, or marketplace release flow."
license: MIT
---

# DAB Extension Release Workflow

## Use when

- Updating one or more child extension `package.json` files.
- Preparing a VSIX release with `package.bat`.
- Adding or removing an extension from the Omnibus extension pack.
- Auditing version numbers before packaging or publishing.

## Repository rules

- Child extensions live in `*-data-api-builder/` folders.
- The Omnibus extension lives in `omnibus-data-api-builder/` and is usually just an extension pack.
- Increment only the changed child extension package versions.
- Do not increment `omnibus-data-api-builder/package.json` unless Omnibus itself changed.
- Keep publisher IDs consistent with existing manifests: `jerry-nixon.<extension-name>`.
- `visualize-data-api-builder` currently publishes the extension ID `jerry-nixon.visualize-api-builder`; preserve that existing ID unless intentionally renaming the Marketplace extension.

## Release checklist

1. Identify changed extension folders from the actual code diff.
2. For each changed child extension, update only its `package.json` `version`.
3. If a new extension was added, update:
   - root `package.json` `workspaces`.
   - root `package.json` build scripts.
   - `omnibus-data-api-builder/package.json` `extensionPack`.
   - `package.bat` menu, `:RUN_ALL`, and per-extension packaging entry.
   - `.vscode/launch.json` all-extension and single-extension debug entries.
   - `.vscode/tasks.json` single-extension build task.
4. Run the smallest relevant build/test first, then broader validation when release-ready.
5. Let the maintainer run `package.bat` manually for packaging/publishing unless explicitly asked to run it.

## Packaging notes

- `package.bat` creates a fresh root `out/` folder and moves VSIX files there.
- Some extensions invoke `npx webpack` before `vsce package --no-dependencies`; preserve existing per-extension packaging behavior.
- Never commit generated VSIX files or the root `out/` package output.

## Completion checks

- Changed child extension versions are incremented.
- Omnibus version is unchanged unless Omnibus files changed.
- New extension IDs are present in Omnibus and packaging scripts when applicable.
- Build/test results are reported with exact task or script names.