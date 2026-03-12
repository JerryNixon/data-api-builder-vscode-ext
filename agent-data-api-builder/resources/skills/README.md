# DAB Skills

This directory contains Agent Skills for Data API Builder (DAB). Skills are self-contained knowledge bundles that enhance GitHub Copilot's capabilities for specialized DAB tasks.
https://learn.microsoft.com/en-us/azure/data-api-builder/command-line/dab-configure?tabs=bash
## Installed Skills

The extension includes **14 specialized skills** covering various DAB scenarios:

### Core DAB Skills
- **data-api-builder-cli** - CLI commands and workflows
- **data-api-builder-config** - Config manipulation and best practices  
- **data-api-builder-auth** - Authentication patterns (JWT, EasyAuth)
- **data-api-builder-mcp** - MCP endpoint setup and client config (includes script)
- **data-api-builder-demo** - Demo scenarios and quickstarts

### Aspire Integration
- **aspire-data-api-builder** - .NET Aspire orchestration (includes scripts)
- **aspire-mcp-inspector** - MCP Inspector with Aspire
- **aspire-sql-commander** - SQL Commander with Aspire  
- **aspire-sql-projects** - SQL Projects with Aspire

### Azure Deployment  
- **azure-data-api-builder** - Azure deployment with Bicep/azd (includes scripts)
- **azure-mcp-inspector** - Deploy MCP Inspector to Azure
- **azure-sql-commander** - Deploy SQL Commander to Azure

### Other
- **docker-data-api-builder** - Containerization with Docker
- **creating-agent-skills** - Meta-skill for creating new skills

## Directory Structure

```
resources/skills/
├── README.md                           # This file
├── data-api-builder-cli/
│   └── SKILL.md
├── data-api-builder-mcp/
│   ├── SKILL.md
│   └── scripts/
│       └── write-vscode-mcp.ps1
├── azure-data-api-builder/
│   ├── SKILL.md
│   └── scripts/
│       ├── azure-up.ps1
│       ├── azure-down.ps1
│       └── post-provision-template.ps1
└── ... (11 more skills)
```

## What Are Skills?

Skills are markdown files that provide:
- **Curated Commands** - Exact syntax that works today
- **Framework-Specific Knowledge** - Database-specific patterns and configurations
- **Best Practices** - What to do and what NOT to do
- **Troubleshooting** - Common issues with exact fixes
- **Workflow Guidance** - Step-by-step tested procedures

## How Skills Work

Skills are packaged directly with the extension and activated via the `chatSkills` contribution point in `package.json`:

```json
"contributes": {
  "chatSkills": [
    {
      "path": "./resources/skills/data-api-builder-cli"
    },
    // ... 13 more skills
  ]
}
```

**Packaging Flow:**
1. Skills stored in `resources/skills/` (git-tracked)
2. `vsce package` includes via `files: ["resources/**/*"]`
3. VS Code loads skills from VSIX at runtime
4. Skills automatically surface when relevant keywords mentioned

**Key features:**
- ✅ No build/compile step needed (markdown + scripts copied as-is)
- ✅ Automatically available after extension install
- ✅ AI assistants surface skills contextually
- ✅ Scripts executable via relative paths

## Updating Skills

Skills are sourced from `dab-quickstarts` repository:

```bash
# Copy updated skills from source
cd agent-data-api-builder
cp -r ../../dab-quickstarts/.github/skills/* ./resources/skills/

# Rebuild and test
npm run compile
code --extensionDevelopmentPath=.

# Package for distribution
vsce package
```

## Creating a New Skill

1. Create skill folder in this directory (e.g., `new-skill-name/`)
2. Add `SKILL.md` with YAML frontmatter
3. (Optional) Add `scripts/` subfolder for automation
4. Update `package.json` `chatSkills` array with new path
5. Follow specification: https://code.visualstudio.com/api/extension-guides/ai/skills

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
