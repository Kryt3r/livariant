---
type: pattern-catalog
status: baseline
domain: patterns
language: en
owner: framework
foundation: FOUNDATION-06H
---

# Pattern Catalog

This catalog provides lightweight discovery metadata. Full semantics remain owned by each Pattern definition.

## permissions

- status: accepted
- version: 0.1
- problem space: authorization and access-control design
- applicability signals: roles, privileges, protected operations, multi-user or multi-tenant access decisions
- anti-applicability signals: no meaningful authorization boundary or only local non-sensitive UI state
- composition hints: authentication, tenant isolation, audit, plugin systems
- definition: `patterns/reference/permissions.md`

## notifications

- status: accepted
- version: 0.1
- problem space: user-facing event notification and delivery behavior
- applicability signals: durable user notifications, multiple channels, preferences, retryable delivery, unread state
- anti-applicability signals: purely transient local UI feedback with no durable or cross-system delivery concern
- composition hints: messaging, settings/preferences, permissions, background jobs
- definition: `patterns/reference/notifications.md`
