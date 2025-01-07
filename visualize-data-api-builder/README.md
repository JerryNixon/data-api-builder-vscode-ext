# Data API Builder (Visualize)

A Visual Studio Code extension that visualizes Data API Builder (DAB) configurations as Mermaid diagrams for better understanding and analysis.

![](https://github.com/JerryNixon/visualize-api-builder-vscode-ext/blob/master/start-data-api-builder/images/screenshot.png?raw=true)

### Simple diagram example

![](https://github.com/JerryNixon/visualize-api-builder-vscode-ext/blob/master/start-data-api-builder/images/screenshot2.png?raw=true)

## Features

- Adds a context menu to right-click on DAB configuration files (`dab-config.json` or `staticwebapp.database.config.json`).
- Automatically generates Mermaid diagrams to represent tables, views, procedures, and their relationships.
- Highlights phantom entities for linking objects not explicitly defined as tables.
- Supports standalone nodes for tables, views, and procedures without relationships.

## Requirements

- Ensure that the [Mermaid Markdown](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension is installed. This should be automatically installed with this extension.
- Valid DAB configuration files must be present in the workspace.

## Release Notes

### 0.0.1

- Initial release: Visualizes DAB configurations with Mermaid diagrams.
- Supports tables, views, procedures, and unnamed linking entities.
- Handles standalone nodes and composite states for organized grouping.

## How to Use

1. Install the extension from the Visual Studio Code marketplace.
2. Open a folder containing your DAB configuration file.
3. Right-click on a configuration file (`dab-config.json` or `staticwebapp.database.config.json`).
4. Select **Visualize DAB** from the context menu.
5. View the generated Mermaid diagram.

## Contribution

Contributions are welcome! Open a pull request or issue in the [GitHub repository](https://github.com/JerryNixon/data-api-builder-vscode-ext).

