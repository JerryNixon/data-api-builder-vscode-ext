# DAB Skills

This directory contains Agent Skills for Data API Builder (DAB). Skills are self-contained knowledge bundles that enhance GitHub Copilot's capabilities for specialized DAB tasks.

## Directory Structure

```
.github/skills/
├── README.md                    # This file
├── dab-sql-server.skill.md      # SQL Server specific guidance (future)
├── dab-postgresql.skill.md      # PostgreSQL specific guidance (future)
├── dab-deployment.skill.md      # Deployment workflows (future)
└── dab-security.skill.md        # Security best practices (future)
```

## What Are Skills?

Skills are markdown files that provide:
- **Curated Commands** - Exact syntax that works today
- **Framework-Specific Knowledge** - Database-specific patterns and configurations
- **Best Practices** - What to do and what NOT to do
- **Troubleshooting** - Common issues with exact fixes
- **Workflow Guidance** - Step-by-step tested procedures

## How Skills Work

During the build process (`npm run merge-agent-docs`), skills are copied from this directory to the extension:

**Source**: `.github/skills/*.md`  
**Destination**: `agent-data-api-builder/resources/skills/*.md`

This allows skills to be:
- ✅ Easily modified in the `.github` folder
- ✅ Version controlled alongside agents
- ✅ Reviewed and updated independently
- ✅ Packaged with the extension automatically

## Creating a New Skill

1. Create a new `.md` or `.skill.md` file in this directory
2. Follow the Agent Skill specification: https://agentskills.io/specification
3. Run `npm run merge-agent-docs` to copy to extension
4. Test with GitHub Copilot

## Example Skill Structure

```markdown
---
name: DAB SQL Server
description: SQL Server specific guidance for Data API Builder
version: 1.0.0
---

# DAB SQL Server Skill

## Connection Strings

[Curated connection string patterns...]

## Common Commands

[Database-specific commands...]

## Troubleshooting

[SQL Server specific issues...]
```

## Benefits of Centralizing Skills

- **Single Source of Truth**: Skills live in `.github/skills`, not scattered across extension folders
- **Easier Collaboration**: Team members can find and edit skills in one location
- **Better Version Control**: Git diffs are clearer when skills are organized
- **Consistent Updates**: Build process ensures extensions always have latest skills

## Future Skills Planned

- **dab-sql-server.skill.md** - SQL Server connection patterns, T-SQL specific features
- **dab-postgresql.skill.md** - PostgreSQL connection patterns, PL/pgSQL features
- **dab-mysql.skill.md** - MySQL connection patterns, stored procedure syntax
- **dab-cosmosdb.skill.md** - Cosmos DB partition keys, NoSQL patterns
- **dab-deployment.skill.md** - Docker, Azure Container Apps, Kubernetes deployments
- **dab-security.skill.md** - Authentication, authorization, RBAC patterns
- **dab-performance.skill.md** - Caching strategies, query optimization
- **dab-mcp.skill.md** - MCP server setup, AI agent integration

## Contributing

To add or modify skills:

1. Edit files in this directory (`.github/skills/`)
2. Test locally with `npm run merge-agent-docs`
3. Commit changes to version control
4. Build process will package skills with extension

## Learn More

- Agent Skills Specification: https://agentskills.io/specification
- GitHub Awesome Copilot: https://github.com/github/awesome-copilot
- DAB Documentation: https://learn.microsoft.com/azure/data-api-builder/
