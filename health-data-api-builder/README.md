# health-data-api-builder

A Visual Studio Code extension that displays Data API Builder health endpoint information in an interactive webview.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/health-data-api-builder/images/screenshot.png?raw=true)

## Features

- Interactive webview for DAB health endpoint visualization
- Support for custom health endpoint URLs
- Automatic refresh capability
- Bootstrap-styled UI with color-coded health status
- Configuration section display
- Response time metrics for each health check
- Tag-based grouping of health checks

## Requirements

- Ensure that `dab` is installed and running: `dotnet tool install microsoft.dataapibuilder -g`
- DAB instance must be running with health endpoint enabled

## Release Notes

### 1.2.4 - 2026-03-14

**Changed**
- Version bump for coordinated release

### 0.1.0 - 2026-01-13

**Added**
- Interactive webview for DAB health endpoint visualization
- Support for custom health endpoint URLs
- Automatic refresh capability
- Bootstrap-styled UI with color-coded health status
- Configuration section display
- Response time metrics for each health check
- Tag-based grouping of health checks

**Features**
- Default endpoints: http://localhost:5000/health and https://localhost:5001/health
- Custom URL input option
- Real-time health status monitoring
- Detailed error display for failed checks
- Visual indicators (✅/❌) for health status

### 0.0.1

- Initial release