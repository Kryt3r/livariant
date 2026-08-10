# Profile Catalog

This catalog is a lightweight discovery index for domain Profiles. Full Profile definitions remain authoritative.

## Discord Platform

- id: `discord-platform`
- version: `0.1`
- status: `accepted`
- trust: `official`
- domain_scope: Discord platform applications and bots
- applicability_signals: interactions, commands, guild/channel/member context, Discord events, platform rate limits
- anti_applicability_signals: projects with no Discord-facing runtime or platform behavior
- composition_hints: web-application, saas, api-backend, permissions, notifications
- location: `profiles/reference/discord-platform.md`

## SaaS

- id: `saas`
- version: `0.1`
- status: `accepted`
- trust: `official`
- domain_scope: multi-user software delivered as an ongoing service
- applicability_signals: organizations/tenants, account lifecycle, plan or entitlement boundaries, operational service ownership
- anti_applicability_signals: single-user local software with no service lifecycle or multi-tenant concerns
- composition_hints: web-application, api-backend, permissions, notifications, payments
- location: `profiles/reference/saas.md`

## Catalog Rules

- Catalog metadata supports discovery; it does not activate Profiles.
- The full Profile definition is authoritative when catalog metadata conflicts with it.
- Version, lifecycle, applicability, or trust-sensitive decisions should verify the full Profile before acting.
- Catalog drift is a repair condition, not a new source of truth.
