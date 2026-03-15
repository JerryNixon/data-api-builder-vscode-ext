# docker-data-api-builder

A Visual Studio Code extension that builds and runs Data API Builder in Docker containers.

![](https://github.com/JerryNixon/data-api-builder-vscode-ext/blob/master/docker-data-api-builder/images/screenshot.png?raw=true)

## Features

- **Create Image** — Generates a `/docker` folder with a Dockerfile embedding your `dab-config.json`, then builds the Docker image. If an `.env` file is present, the connection string is extracted into a Docker environment file.
- **Docker Up** — Creates a `docker-compose.yml` and runs `docker compose up`. Once the container is running, the `/health` endpoint URL is emitted and opened in your browser.

## Usage

1. Right-click on a `dab-config.json` file in the Explorer.
2. Select **"Create Image"** or **"Docker Up"** from the DAB Docker menu.

## Requirements

- Docker CLI must be installed and available in your PATH.
- Ensure that `dab` is installed: `dotnet tool install microsoft.dataapibuilder -g`

## Release Notes

### 1.0.1 - 2026-03-14

**Changed**
- Version bump for coordinated release

### 1.0.0 - 2026-03-13

**Added**
- Create Image command: generates Dockerfile, copies config, builds image
- Docker Up command: generates docker-compose.yml, starts container, opens health endpoint
- Docker CLI availability check with user-friendly error message
- Automatic `.env` to Docker env file conversion for connection strings
