# Change Log

All notable changes to the "validate-data-api-builder" extension will be documented in this file.

## [0.3.0] - 2026-01-13

### Added
- Dedicated Output Channel for validation results
- Progress notification during validation
- Simple status indicators (✅ VALID / ❌ INVALID)
- Migrated to shared package for config validation
- Auto-opens output channel to show results

### Changed
- Replaced terminal output with child_process execution for better control
- Shows clean DAB CLI output without extra formatting
- Added skipLibCheck to TypeScript config for better compatibility
- Simplified output to just show raw validation results plus status

### Fixed
- Output now displays immediately in readable format
- Better handling of validation success/failure states

## [0.2.0] - 2025-XX-XX

- Previous version

## [Unreleased]

- Initial release