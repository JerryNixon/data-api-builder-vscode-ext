# DAB Auth Scenario Matrix (Quickstarts 1-5)

## Summary

| Scenario | Inbound (User→API) | Outbound (API→SQL) | Enforcement layer | Notes |
|---|---|---|---|---|
| QS1 | Anonymous | SQL Auth | None | Fastest baseline, least secure for prod |
| QS2 | Anonymous | Managed Identity (Azure) | None | Removes DB secret in cloud |
| QS3 | Anonymous role with Entra provider configured | Managed Identity (Azure) | None | Auth infra staged; user experience still anonymous |
| QS4 | Entra token | Managed Identity (Azure) | DAB policy | Per-user filtering with `@item`/`@claims` |
| QS5 | Entra token | Managed Identity (Azure) | SQL RLS | Strongest data-layer enforcement |

## What changes per scenario

### QS1 → QS2
- DAB config can remain mostly unchanged.
- Infra and connection semantics change to managed identity in Azure.

### QS2 → QS3
- Add `runtime.host.authentication` provider `EntraId`.
- Keep entity role `anonymous` for staged rollout.

### QS3 → QS4
- Change entity role to `authenticated`.
- Add policy for read/update/delete, e.g.:
  - `@item.Owner eq @claims.preferred_username`
- Web app must send bearer token.

### QS4 → QS5
- Remove DAB row policy.
- Add SQL predicate function + security policy (RLS).
- Keep Entra + bearer flow.

## Practical recommendation

- Production default: QS2 minimum.
- Multi-user app with quick policy delivery: QS4.
- High assurance data boundaries: QS5.
