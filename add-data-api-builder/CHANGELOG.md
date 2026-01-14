# Change Log

All notable changes to the "add-data-api-builder" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0] - 2026-01-13

### Added
- Auto-dismiss dialogs after 5 seconds for better UX (error, info, warning messages)
- Data types in field descriptions for tables and views (e.g., "ActorId (int)")
- Parameter descriptions with types for stored procedures
- Field descriptions for stored procedure result columns
- Required `--fields.primary-key` parameter for all table/view fields

### Fixed
- Stored procedure parameter handling (removed incorrect `--source.params` usage)
- Entity names now strip brackets to avoid CLI errors
- Stored procedures default to GET method instead of POST
- Async filtering bug preventing duplicate stored procedure detection
- Removed incorrect `--map` usage for tables and views
- Relationship field parsing to use `source.fields`/`target.fields` from config JSON
- Bidirectional relationship filtering to properly exclude already-added relationships
- Undefined field array handling that caused "Cannot read properties of undefined" errors

### Changed
- Enhanced SQL queries to retrieve column data types via `TYPE_NAME()`
- Improved relationship duplicate detection to check both forward and reverse relationships

## [0.1.0] - 2025-12-XX

- Initial release