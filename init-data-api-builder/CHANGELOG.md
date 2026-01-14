# Change Log

All notable changes to the "init-data-api-builder" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- Single consolidated multi-select dialog for all configuration options
- REST, GraphQL, MCP, Cache, Developer Mode, and Simulated security all in one dialog
- MCP (Model Context Protocol) endpoint configuration support
- Developer Mode checkbox to control development vs production host mode
- Simulated security option integrated into main dialog (defaults to unchecked)

### Changed
- Consolidated ALL configuration dialogs into single multi-checkbox selection
- Simulated security option moved from separate dialog to main features dialog
- Improved user experience - from 3 separate dialogs down to 1
- Standard security is now the default (Simulated requires explicit selection)

### Removed
- Individual boolean prompts for REST, GraphQL, and Cache options
- Separate host mode selection dialog
- Separate security provider selection dialog

## [1.0.0] - Initial Release

- Initial release with guided prompts for DAB configuration