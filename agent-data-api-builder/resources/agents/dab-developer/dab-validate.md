# `dab validate` Reference

## Purpose

Validate config correctness before startup or deployment.

## Command

`dab validate`

## What it checks

- Config schema validity
- Permission/action compatibility
- Database connectivity
- Source object availability (tables/views/procs)

## Recommended usage

- Run after every meaningful config change.
- Gate start/deploy on successful validation.

## Related docs

- [dab-start.md](dab-start.md)
- [troubleshooting.md](troubleshooting.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-validate
