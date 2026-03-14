---
name: data-api-builder-auth
description: Select and implement Data API Builder authentication and authorization patterns across anonymous, token-based, policy, and SQL RLS flows.
license: MIT
---

# Data API Builder Auth

## Use when

- Choosing between anonymous and authenticated API access.
- Implementing row-level access controls via DAB policy or SQL RLS.
- Migrating auth models.

## Workflow

1. Pick target auth pattern.
2. Update runtime auth provider and entity permissions.
3. Apply policy and/or SQL RLS rules.
4. Validate behavior with representative requests.

## Guardrails

- Avoid `anonymous:*` outside explicit local development.
- Do not duplicate equivalent row-filter logic in both DAB and SQL unless intentional.
- Ensure audience/issuer values are real for token-based providers.

## Related skills

- `data-api-builder-config`
- `azure-data-api-builder`

## Microsoft Learn

- https://learn.microsoft.com/azure/data-api-builder/concept/security/authentication
