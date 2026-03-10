# SQL Dev Environment - Quick Reference

## 🔗 Service URLs

| Service | URL |
|---------|-----|
| SQL Commander | http://localhost:8080 |
| REST API | http://localhost:5000/api/{EntityName} |
| GraphQL | http://localhost:5000/graphql |
| **MCP Inspector** | [**Click to Connect →**](http://localhost:6274/?transport=streamable-http&serverUrl=http%3A%2F%2Fapi-server%3A5000%2Fmcp) |

> Replace `{EntityName}` with your DAB entity (e.g., `Todo`).
> MCP Inspector needs the special link above; plain `localhost:6274` will not auto-connect to DAB.

## Commands

```bash
docker compose up -d    # Start
docker compose down     # Stop
docker compose down -v  # Stop + delete data
```

## SQL Server Connection

**From host**: Server=localhost,14330;Database=TodoDb;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true

Regenerate this file whenever ports, service names, or entity names change.
