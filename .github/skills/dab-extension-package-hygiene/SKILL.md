---
name: dab-extension-package-hygiene
description: "Use when reviewing DAB VS Code extension package size, webpack output, .vscodeignore, .gitignore, build artifacts, node_modules, VSIX contents, or dependency bloat."
license: MIT
---

# DAB Extension Package Hygiene

## Use when

- Adding runtime dependencies to an extension.
- Reviewing package size or VSIX contents.
- Editing `.gitignore`, `.vscodeignore`, webpack config, or package `files` entries.
- Preventing generated artifacts from being committed.

## Size principles

- Ship the smallest VSIX that still works in VS Code.
- Bundle extension runtime code with webpack where the extension already uses webpack.
- Keep `vscode` external in webpack bundles.
- Avoid pulling database libraries into extensions that do not query databases.
- Prefer shared generic code over duplicated local code, but do not force heavyweight shared dependencies into lightweight extensions.

## Git hygiene

- Never commit generated build artifacts: `out/`, `dist/`, `.vscode-test/`, VSIX files, package output, logs, caches, or `node_modules/`.
- Root `.gitignore` already ignores broad build output including `out/`, `dist/`, `.vscode-test/`, and `node_modules/`.
- If a new tool creates output, add an ignore rule before it becomes accidental cargo. Tiny yak, big payoff.
- Keep `.vscode/launch.json` and `.vscode/tasks.json` tracked; root `.gitignore` explicitly allows them.

## VSIX hygiene

- Check each extension's `.vscodeignore` or package `files` list when adding assets.
- Include required runtime assets such as icons, bundled `dist/**/*`, and deliberately packaged `resources/**/*`.
- Exclude source tests, fixtures that are not needed at runtime, build caches, maps unless needed, and generated package output.
- For `agent-data-api-builder`, `resources/agents/**` and `resources/skills/**` are runtime assets and must be packaged when used by the extension.

## Review workflow

1. Inspect the dependency being added and whether it belongs in runtime `dependencies` or `devDependencies`.
2. Verify webpack/package config includes required runtime files and excludes build-only files.
3. Verify `.gitignore` prevents generated artifacts from being committed.
4. Build/package only the affected extension when possible.
5. Report any package-size or dependency tradeoffs clearly.

## Completion checks

- No generated artifacts are staged or required in source control.
- Runtime dependencies are justified and scoped to the extensions that need them.
- VSIX includes required runtime assets and excludes test/build clutter.