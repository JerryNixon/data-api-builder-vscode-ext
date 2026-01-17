# Change Log

All notable changes to the "start-data-api-builder" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.0] - 2026-01-13

### Added
- Configuration file validation before starting DAB
- Error message when attempting to start with invalid config file
- Migrated to dab-vscode-shared package for terminal management

### Changed
- Terminal management now uses shared package for consistency
- Added config path validation using shared utilities

### Removed
- Local runTerminal.ts in favor of shared package

## [1.1.0] - 2025-XX-XX

- Previous version

## [1.0.0] - Initial Release

- Initial release