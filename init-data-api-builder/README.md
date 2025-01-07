# Init Data API Builder

A Visual Studio Code extension that guides users through initializing Data API Builder in a folder.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/init-data-api-builder/images/screenshot.png?raw=true)

## Features

- Adds a right-click context menu for folders.
- Guides users through prompts for `dab init` configuration.
- Automatically updates `.env` and `.gitignore`.

## Requirements

- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`.

## Known Issues

- Assumes `dab` is available globally in your environment.
- Prompts may fail if folder paths contain unsupported characters.

## Release Notes

### 1.0.0

- Initial release: Guided prompts for `dab init` and configuration updates.