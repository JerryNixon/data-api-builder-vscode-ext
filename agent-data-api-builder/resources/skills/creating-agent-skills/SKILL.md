---
name: creating-agent-skills
description: Create and audit GitHub Copilot Agent Skills with clear discovery descriptions, correct SKILL.md frontmatter, and reusable multi-step workflows.
license: MIT
---

# Creating GitHub Copilot Agent Skills

Create skills that are **discoverable**, **actionable**, and **compact**. Prefer short instructions with explicit decision points over long reference dumps.

## When to use a skill

Use a skill when the task is repeatable and multi-step.

Use another primitive when:
- **Instructions**: guidance should apply to most tasks in a repo
- **Prompt**: one focused operation with clear inputs
- **Custom agent**: requires stage isolation or different tool permissions by phase

## Authoring workflow

1. **Extract the workflow**
   - Capture steps, branching decisions, and completion checks from context.
2. **Clarify only gaps**
   - Ask for: outcome, scope (workspace/personal), and depth (checklist/full workflow).
3. **Draft `SKILL.md`**
   - Add frontmatter first, then concise procedural content.
4. **Harden discovery**
   - Improve `description` with trigger phrases users actually say.
5. **Finalize**
   - Add test prompts and related follow-on customizations.

## Location and structure

Project scope:
```
.github/skills/<skill-name>/
├── SKILL.md
├── scripts/        # optional
├── references/     # optional
└── assets/         # optional
```

Personal scope:
```
~/.copilot/skills/<skill-name>/
└── SKILL.md
```

Rules:
- Folder and `name` must match.
- Use lowercase + hyphens for skill names.
- File name must be exactly `SKILL.md`.

## Required SKILL.md frontmatter

```yaml
---
name: skill-name
description: 'What this skill does and when to use it.'
argument-hint: 'Optional hint for slash invocation'
user-invocable: true
disable-model-invocation: false
---
```

Validation:
- `name`: 1-64 chars, lowercase alphanumeric and hyphens
- `description`: concrete outcome + trigger phrases
- Quote `description` when punctuation (for example `:`) may break YAML
- Frontmatter must be the first content in the file

## Description quality standard

Good descriptions:
- Start with outcome/action (`Create`, `Enable`, `Debug`, `Deploy`)
- Include plain-language trigger phrases users type
- Mention concrete artifacts when relevant (`dab-config.json`, `.vscode/mcp.json`)

Avoid:
- “Guide for …” filler
- “Use when working with …” vagueness
- Tool-only jargon without plain-language synonyms

## Minimal body template

```markdown
# <Skill Title>

One short paragraph: what this skill produces.

## When to Use
- Trigger phrase 1
- Trigger phrase 2

## Procedure
1. Step one
2. Step two
3. Step three

## Decision Points
- If A, do X
- If B, do Y

## Completion Checks
- Check 1
- Check 2

## References
- Optional local references when needed
```

## Progressive loading guidance

- Keep `SKILL.md` focused (prefer concise files over encyclopedic docs).
- Move deep content to `references/` and link with relative paths.
- The `description` is the discovery surface; optimize it first.

## Completion checklist

A skill is ready when all are true:
- Workflow is executable end-to-end by a newcomer.
- Branching logic is explicit.
- Completion checks are objective.
- At least 3 test prompts reliably trigger the skill.
- No secrets, credentials, or sensitive data are embedded.

## Example test prompts

- "Create a new skill for reviewing PRs with a checklist."
- "Refine this SKILL.md description so discovery works better."
- "Audit this skill for missing decision points and completion checks."

## References

- [Agent Skills docs](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [Agent Skills structure and metadata](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
