# `dab start` Reference

## Purpose

Start the DAB runtime using the active config.

## Command

`dab start`

## Default endpoints

- REST: `http://localhost:5000/api`
- GraphQL: `http://localhost:5000/graphql`
- MCP: `http://localhost:5000/mcp` (if enabled)
- Health: `http://localhost:5000/health` (if enabled)

## Startup checklist

1. Environment variables resolved.
2. `dab validate` succeeds.
3. Database is reachable.

## Related docs

- [dab-validate.md](dab-validate.md)
- [runtime.md](runtime.md)

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/command-line/dab-start
