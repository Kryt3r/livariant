---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Isolation, Data Boundaries & Multi-Tenant Security

**Foundation:** FOUNDATION-05C

## Purpose

Isolation is a security property that must survive every path through which data, authority, execution, or resources can cross between contexts that are intended to remain separate.

> Isolation is a security property, not merely a data-model convention.

## Isolation domains

An **Isolation Domain** is a context whose data, authority, execution, or resources must remain separated from another domain unless explicit cross-domain authority exists.

Examples may include users, tenants, guilds, organizations, projects, environments, plugins, workloads, or regions.

Isolation applies not only to primary database reads, but also to writes, deletes, listings, search, caches, jobs, events, files, logs, indexes, notifications, analytics, secrets, and resource consumption.

## Scoped operations

> Every isolation-sensitive operation must execute within an established isolation scope.

A client-supplied tenant, guild, project, or resource identifier identifies a requested target; it does not establish authority over that target.

Architectures should prefer making the safe scoped path the natural path and requiring explicit escalation for cross-domain access.

## Resource identifiers

Knowledge of a resource identifier never establishes authority over the resource. Identifier unpredictability may reduce discovery or enumeration but must not replace authorization.

Collection operations, searches, exports, reports, and aggregations must preserve the same isolation property as individual-object access.

## Cross-domain authority

Cross-domain access is a privileged capability. Legitimate use cases such as administration, support, migration, backup, or investigation should remain explicit and proportionally governed.

Broad administrative authority should remain exceptional even when technically available.

Ownership transfer and cross-domain resource movement are privilege and isolation-boundary transitions. Authority must cover every security-relevant side of the transition.

## Isolation across derived and asynchronous systems

Isolation-sensitive context must survive handoffs into caches, asynchronous jobs, queues, webhooks, files, search indexes, vector stores, analytics systems, logs, notification systems, and other derived stores.

> Derived stores inherit the isolation requirements of their source data.

Security context required for an asynchronous effect must survive the handoff into asynchronous execution.

Outbound effects must preserve the isolation scope of the originating data.

## Caching

Cache identity must include every security-relevant dimension needed to prevent one isolation domain from receiving another domain's result. This applies to application caches, edge caches, CDNs, and comparable shared caching layers.

## Observability

Isolation-sensitive data remains sensitive when copied into logs, traces, error reporting, metrics, or other observability systems. Observability is part of the data boundary rather than outside it.

## Storage and files

File retrieval, mutation, generated downloads, object storage, and signed access mechanisms must preserve resource authority and isolation. Path structure or identifier obscurity alone is not authorization.

## Isolation strategies

The Core does not mandate one technical strategy. Valid approaches may include logical isolation through scoped records and policies or stronger physical separation through schemas, databases, infrastructure, or other boundaries.

> Isolation strength should match consequence, threat model, and operational constraints.

Stronger physical separation may reduce blast radius while increasing operational cost. The trade-off should be deliberate.

## Environment isolation

Development, staging, and production may be separate isolation domains when data, credentials, or operational consequence differ.

> Lower-trust environments should not automatically receive higher-trust data.

Production data or secrets should not flow into lower-trust environments merely for convenience. Any required transfer should follow deliberate minimization and protection appropriate to the project.

## Secret scope

Secret lookup must preserve the same scope as the authority the secret grants. Tenant-, project-, environment-, or integration-specific credentials must not silently become global credentials through storage or runtime convenience.

## Availability isolation

Shared infrastructure must consider whether one isolation domain can exhaust resources needed by others. Isolation therefore includes availability and blast-radius concerns as well as confidentiality and integrity.

Profiles and patterns may define quotas, rate limits, scheduling fairness, or resource caps where appropriate.

## Migrations, backup, and lifecycle

Data migrations must explicitly account for isolation scope rather than rely on application-layer assumptions.

Backup and restore paths are part of the isolation model and must not accidentally move data into the wrong domain or environment.

Isolation lifecycle includes creation, normal operation, transfer, and deprovisioning. Deleted or deactivated domains should not leave uncontrolled jobs, caches, files, tokens, webhooks, or other ghost resources behind.

## Trusted computing base

Components that legitimately bypass or span isolation boundaries, such as migration runners, backup systems, or global administrative services, become part of the trusted computing base and require proportionally stronger scrutiny, privilege minimization, and auditability.

## Encryption

Encryption may strengthen isolation or reduce compromise impact, but it does not itself establish authorization.

> Encryption may strengthen isolation but does not replace authorization.

## Isolation verification

Isolation cannot be meaningfully verified with only one isolation domain. Relevant testing should include at least two independent domains and negative paths such as cross-domain read, write, delete, list, search, background-job, or derived-store access where applicable.

Useful evidence may include negative integration tests, database-policy tests, cross-domain API tests, cache isolation tests, queue or job scope tests, and security review.

## Core principles

> **Isolation is a security property, not merely a data-model convention.**

> **An isolation domain defines data, authority, execution, or resources that must remain separated unless explicit cross-domain authority exists.**

> **Every isolation-sensitive operation must execute within an established scope.**

> **Prefer architectures where the safe scoped path is natural and cross-domain access is explicit.**

> **Knowledge of a resource identifier never establishes authority over that resource.**

> **Isolation must survive caches, queues, jobs, indexes, files, logs, notifications, and other derived or asynchronous paths.**

> **Derived stores inherit the isolation requirements of their source data.**

> **Cross-domain access and ownership transfer are privileged boundary transitions.**

> **Environment boundaries are security boundaries when trust or consequence differs.**

> **Shared infrastructure must consider availability isolation and blast radius, not only confidentiality.**

> **Components that bypass isolation become part of the trusted computing base and require stronger scrutiny.**

> **Isolation cannot be meaningfully verified with only one isolation domain.**

> **Encryption may strengthen isolation but does not replace authorization.**
