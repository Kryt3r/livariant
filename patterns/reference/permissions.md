---
type: reusable-pattern
status: accepted
id: permissions
version: 0.1
language: en
owner: framework
foundation: FOUNDATION-06H
---

# Permissions Pattern

## Problem Space

Choose and structure a reusable authorization model for systems where access rules must remain understandable, maintainable, and consistent as principals, resources, roles, scopes, or relationships grow.

This Pattern assumes the universal identity and authorization properties defined by Core. It does not restate or replace them.

## Applicability

Use when a system has multiple principals, roles, tenants, privileges, protected resources, or operations whose availability depends on identity, relationship, or context and a reusable permission model would reduce ad-hoc policy logic.

## Anti-Applicability

Do not introduce a generalized permission model for purely local presentation state or where no meaningful authorization variability exists. Avoid speculative role or policy engines when a small number of direct ownership or fixed-boundary checks fully represents the problem.

## Forces & Trade-offs

- simplicity versus expressiveness,
- centralized policy vocabulary versus local domain ownership,
- coarse roles versus fine-grained permissions,
- static assignment versus contextual authorization,
- auditability and explainability versus model complexity,
- policy reuse versus accidental coupling between unrelated resources.

## Solution Space

Common approaches include:

- role-based access control (RBAC),
- attribute-based access control (ABAC),
- relationship-based authorization,
- explicit capability or permission grants,
- direct ownership or membership rules,
- combinations of these where the additional complexity is justified.

Prefer the simplest model that faithfully represents the actual authorization rules and remains understandable under expected change.

Selection should consider whether permissions are naturally role-shaped, resource-shaped, relationship-shaped, contextual, tenant-scoped, or delegated rather than forcing every rule into one abstraction.

## Inherited Core Constraints

Core remains authoritative for universal properties such as authoritative enforcement, identity-versus-authority separation, trusted scope derivation, fail-closed privileged decisions, complete mediation, and authorization freshness.

The Pattern must be composed with those Core constraints rather than duplicating them as Pattern-owned invariants.

## Pattern-Level Invariants

When this Pattern is selected:

- the permission vocabulary should map to meaningful product or domain capabilities rather than incidental UI structure,
- equivalent protected effects should resolve through consistent permission semantics,
- scope boundaries such as tenant, project, guild, organization, or resource ownership must be represented explicitly when they materially affect permission meaning,
- permission abstractions should not become more generic than the demonstrated authorization problem requires.

## Failure Modes

- role names becoming implicit business logic scattered through code,
- one global role namespace accidentally crossing tenant or resource boundaries,
- permissions mirroring UI screens rather than durable capabilities,
- combining unrelated authorization concerns into an unreadable universal policy model,
- creating a highly generic permission engine before actual requirements exist,
- assuming one authorization paradigm fits every protected resource merely because it is already implemented.

## Decision Surface

The Pattern does not choose the project's role model, permission vocabulary, authorization technology, tenant semantics, policy storage, inheritance rules, delegation behavior, or administrative UX. Material architecture choices remain project decisions.

## Composition Surface

Common interactions include authentication, tenant isolation, audit logging, API boundaries, delegated authority, plugin systems, and administrative settings.

A dependency on authentication, tenant context, or delegation triggers discovery/evaluation of those concerns; it does not automatically select another Pattern.

## Verification Guidance

In addition to applicable Core authorization verification, validate that the chosen permission model expresses representative real rules without bypasses, accidental cross-scope inheritance, contradictory semantics, or unjustified complexity. Test both common and boundary cases of the chosen model.

## Examples & Evidence

Example: a multi-tenant application may choose tenant-scoped RBAC because its permission vocabulary is stable and role-shaped. Another application with resource-sharing relationships may prefer relationship-based authorization. Either selection becomes project knowledge rather than universal Pattern truth.
