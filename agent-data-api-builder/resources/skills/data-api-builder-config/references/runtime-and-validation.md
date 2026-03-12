# Runtime and validation checklist

## Runtime essentials

- Disable unused surfaces (`rest.enabled`, `graphql.enabled`, `mcp.enabled`).
- Use strict CORS for non-local environments.
- Prefer Entra ID for production authentication.
- In Aspire local OTEL contexts, avoid unresolved optional `@env()` values.

## Validation loop

1. Edit config.
2. Run `dab validate`.
3. Fix the first failing error.
4. Re-run until clean.
5. Start runtime and verify endpoint behavior.

```bash
dab validate --config dab-config.json
```

## Completion checks

- Config is schema-valid.
- Permissions and policies are intentional.
- Exposed endpoints match requested surface area.
- Health endpoint is reachable at runtime.
