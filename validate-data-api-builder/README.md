# Data API Builder (Validate)

A Visual Studio Code extension that provides a quick way to validate Data API Builder configurations directly from `dab-config.json` or `staticwebapp.database.config.json`.

![](https://raw.githubusercontent.com/JerryNixon/data-api-builder-vscode-ext/refs/heads/master/validate-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for `dab-config.json` or `staticwebapp.database.config.json`.
- Opens a terminal and runs `dab validate -c <config-file>`.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`.

## Known Issues

- The context menu only appears for `dab-config.json` or `staticwebapp.database.config.json`.
- The terminal assumes `dab` is globally available in your environment.

## Release Notes

### 0.0.1

- Initial release: Validate Data API Builder configurations directly from supported files.