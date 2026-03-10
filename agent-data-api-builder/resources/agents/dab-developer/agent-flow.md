# DAB Agent Flow (chat participant)

This outlines how the `@dab` chat participant processes requests, including decision points and tool usage.

## Mermaid workflows

### 1. Uber: user journey
```mermaid
flowchart TD
    A(["User: I need you to..."]) --> B{Have DB?}
    B -->|Yes| C[Existing DB]
    B -->|No| D{Have idea?}
    D -->|Yes| E[Has idea]
    D -->|No| F[Needs clarity]
    F --> E
    C --> G[[Schema flow]]
    E --> G
    G --> H[[Environment flow]]
    H --> I[[API flow]]
    I --> J[[Hosting flow]]
```

### 2. Schema design
```mermaid
flowchart TD
    A{Have DB?} -->|Yes| B[Inspect schema]
    A -->|No| C[Clarify use case]
    C --> D[Draft entities]
    B --> D
    D --> E[Draft relationships]
    E --> F[Write SQL DDL]
    F --> G[Write sample data]
    G --> H{Schema good?}
    H -->|No| D
    H -->|Yes| I([Done])
```

### 3. Environment prep
```mermaid
flowchart TD
    A{Docker installed?} -->|No| B[Install Docker]
    A -->|Yes| C{sqlcmd installed?}
    B --> C
    C -->|No| D[Install sqlcmd]
    C -->|Yes| E[Start container]
    D --> E
    E --> F[Deploy DDL]
    F --> G[Seed data]
    G --> H{DB reachable?}
    H -->|No| E
    H -->|Yes| I([Done])
```

### 4. Data API
```mermaid
flowchart TD
    A{REST or MCP?} -->|REST| B[REST for apps]
    A -->|MCP| C[MCP for agents]
    B --> D[No direct DB]
    C --> D
    D --> E[Run dab init]
    E --> F[Add entities]
    F --> G[Validate config]
    G --> H{Config valid?}
    H -->|No| F
    H -->|Yes| I([Done])
```

### 5. Hosting
```mermaid
flowchart TD
    A{Already in cloud?} -->|Yes| B[Use cloud DB]
    A -->|No| C{Ready for cloud?}
    C -->|Yes| D[Azure SQL + ACA]
    C -->|Not yet| E[Stay local]
    E --> F[Nudge cloud next]
    B --> G([Done])
    D --> G
    F --> G
```

### 6. Help / Fix
```mermaid
flowchart TD
    A{Issue type?} -->|General| B[Help buttons]
    A -->|Error| C[Diagnose]
    C --> D{Known pattern?}
    D -->|Yes| E[Targeted fix]
    D -->|No| F[Run diagnostics]
    E --> G([Done])
    F --> G
    B --> G
```

## High-level branches
1) Extension activation
   - Trigger: VS Code startup (`onStartupFinished`).
   - Actions: register LM tools (`dab_cli`, `get_schema`), register chat participant, set icon and followups. Sources: [src/extension.ts](src/extension.ts), [src/tools/chatTools.ts](src/tools/chatTools.ts).

2) Entry perspective
   - Users may arrive with an existing DB, an idea needing a schema, or no environment yet.
   - We capture intent, clarify goals, and prepare tools (Docker/sqlcmd) before deeper steps.

3) Schema-first flow (default)
   - Capture use case and data needs; propose entities and relationships.
   - Generate SQL DDL plus sample data scripts; no DB required until user opts to test locally.
   - If user wants a dry-run: deploy schema to Docker/local SQL and seed data; otherwise keep planning.

4) Environment prep flow
   - Detect Docker/sqlcmd readiness; install/start if missing.
   - Verify connectivity; seed sample DB for quick tests.

5) Data API flow (after schema agreement)
   - Choose surface: REST or MCP (agent vs app). Reinforce that apps/agents never hit the DB directly.
   - Run `dab init` when schema is set; build/merge `dab-config*.json` accordingly, keeping entity/relationship alignment.
   - Validate config and stream outputs; offer follow-ups.

6) Deploy/host guidance
   - Prefer cloud: Azure SQL for data + DAB running in Azure Container Apps.
   - If local is required (Docker/local SQL), support it but nudge toward cloud migration next.

7) Help / troubleshooting
   - Help intents → `handleHelp()` (buttons + short explainer).
   - Fix intents → `handleFix()` for targeted remedies (connection, port, CORS, view key-fields) and a quick diagnostic table; validation button when config exists.

8) LLM + tools loop (`handleWithLLM`)
   - Build system prompt from bundled instructions (merge main `dab-developer.agent.md` then sorted child docs). Source: [src/instructions.ts](src/instructions.ts).
   - Build workspace context: locate `dab-config*.json`, summarize entities/relationships, find connection strings from `.env`/`local.settings.json`.
   - Iterate tool calls (up to 10 rounds) using `dab_cli` and `get_schema`; stream partial responses.

9) Tools (registered in `src/tools/chatTools.ts`)
   - `dab_cli`: wraps DAB CLI subcommands (init/add/update/configure/validate/start/status), auto-loads `.env`, honors `--config`, can start in background, normalizes flags (e.g., `relationshipFields` → `relationship.fields`).
   - `get_schema`: SQL Server schema discovery; supports filters (tables/views/procs/functions/summary), returns objects + foreign-key relationships for relationship planning.

10) Follow-ups
   - After schema/API progress → suggest “Add entities”, “Validate config”, “Start DAB” as appropriate.
   - After help → “Initialize DAB”, “Learn more”.

11) Operational tips
   - Keep `npm run watch` running so the participant always has `out/` artifacts.
   - Ensure Docker Desktop is started before local schema tests; surface installer links when missing.
   - Place connection strings in `.env` (e.g., `DATABASE_CONNECTION_STRING`) so the agent surfaces and reuses them.

## Fast reference: decision tree (text)
- Activation → tools + participant registered
   - User prompt: “I need you to…”
   - Assess state: existing DB vs idea vs unclear
   - Schema design → propose entities + sample data → optional local deploy
   - Environment → ensure Docker/sqlcmd; seed sample DB
   - Data API → choose REST or MCP; no direct DB; run `dab init`; validate config
   - Hosting → cloud (Azure SQL + ACA) or local (Docker/SQL)
   - Help / Fix → buttons or targeted remedies → tool loop (`dab_cli`, `get_schema`) as needed