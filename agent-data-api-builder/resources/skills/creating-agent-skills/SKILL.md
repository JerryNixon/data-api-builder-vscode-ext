---
name: creating-agent-skills
description: Create and audit Copilot skills with strong discovery metadata, compact workflows, and explicit completion checks.
license: MIT
---

# Creating Agent Skills

## Use when

- Authoring a new `SKILL.md`.
- Tightening skill discovery and workflow quality.
- Auditing skills for ambiguity or over-verbosity.
- Packaging reusable scripts, references, or templates with a skill.

## Workflow

1. Define expected outcome and triggers.
2. Create `<skill-name>/SKILL.md`; `name` must exactly match the parent folder.
3. Write concise frontmatter and discovery-focused `description`.
4. Add minimal procedural steps, decision points, and completion checks.
5. Move long details into referenced `scripts/`, `references/`, or `assets/` files.

## Frontmatter

Required:
- `name`: kebab-case, lowercase letters/numbers/hyphens only, max 64 chars, no namespaces, must match folder.
- `description`: what the skill does and when to use it; max 1024 chars; primary routing signal.

Optional:
- Open Agent Skills spec: `license`, `compatibility`, `metadata`, experimental `allowed-tools`.
- VS Code/Copilot: `argument-hint`, `user-invocable`, `disable-model-invocation`, experimental `context: fork`.

Do not put `version` in `SKILL.md`; plugin/package versioning belongs in `plugin.json` or the distribution wrapper.

## Layout

```text
skill-name/
  SKILL.md
  scripts/      # optional executable helpers
  references/   # optional focused docs
  assets/       # optional templates/resources
```

Reference bundled files from `SKILL.md` with relative Markdown links so agents can load them on demand.

## Guardrails

- Keep skills short and executable.
- Use "Use when..." trigger language with concrete keywords.
- Avoid embedding secrets or environment-specific credentials.
- Prefer skills for portable multi-file capabilities; use prompt files for one-off slash commands and custom agents for personas/tool restrictions.

## Related docs
- https://code.visualstudio.com/docs/copilot/customization/agent-skills
- https://code.visualstudio.com/docs/copilot/customization/agent-plugins
- https://code.visualstudio.com/docs/copilot/customization/custom-agents
- https://agentskills.io/specification
