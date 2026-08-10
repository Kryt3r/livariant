---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Identity, Authentication & Authorization Model

**Foundation:** FOUNDATION-05B

## Purpose

The framework must distinguish identity from authority. Authentication establishes an actor identity under specific evidence; authorization determines whether that actor may perform a particular action on a particular resource in the current context.

> Identity is not authority.

## Actors

The Core uses the concept of an **Actor** rather than assuming every request originates from a human user. An actor may be a human user, service, bot, worker, third-party integration, administrator, agent, automation, or delegated principal.

Conceptually:

```text
Actor
↓
Identity
↓
Authentication
↓
Context
↓
Requested Action
↓
Target Resource
↓
Authorization Decision
```

## Identity strength

Identity strength should match the consequence of relying on that identity. Anonymous, authenticated user, service, and privileged identities may rely on different authentication evidence.

High-consequence privilege changes may require fresher or stronger authentication evidence than ordinary session use.

## Authentication evidence

> Authentication evidence must not be interpreted more broadly than the identity claim it actually establishes.

A valid login, token, session, or service identity does not by itself prove resource ownership, tenant membership, administrator authority, or continued validity of older privilege state.

## Authorization decision model

Authorization should consider at least:

- actor,
- requested action,
- target resource,
- relevant context.

The Core does not mandate one technical authorization paradigm. RBAC, ABAC, ownership checks, capabilities, scoped permissions, or other approaches may implement the model.

Roles may contribute to authorization but do not replace resource scope or target-specific evaluation.

## Client-supplied scope

> Client-supplied scope identifies the requested target; it does not establish authority over that target.

A tenant ID, guild ID, organization ID, resource ID, owner ID, or other client-controlled identifier must be treated as a requested target until trusted authorization logic establishes that the actor may operate on it.

Ownership relationships should be derived from trusted system state rather than accepted from the requesting client as proof of authority.

## Authoritative enforcement

> Every privileged effect requires an authoritative enforcement point.

The concrete location may be middleware, a service layer, domain layer, database policy, gateway, or another appropriate component. The Core does not require a specific architecture, but authorization ownership and semantics must be clear enough to prevent bypass.

Client-side restrictions, hidden UI controls, or routing logic are user experience behavior rather than security enforcement.

## Complete mediation

Authorization must protect every relevant path to a privileged effect, including legacy, alternate, internal, batch, or integration paths where applicable.

Protecting the primary user interface or most common API path is insufficient if another reachable path can perform the same privileged action without equivalent authorization.

## Authorization placement

Authorization logic should have clear ownership and consistent semantics while remaining sufficiently close to the protected effect to resist bypass and stale-decision gaps.

A single global permission file is not automatically safer than well-owned local enforcement, and hundreds of unrelated checks are not automatically stronger than coherent policy.

## Privilege transitions

> Privilege elevation is a trust-boundary transition.

Changes such as user-to-admin, member-to-moderator, or service-to-elevated-service may require stronger verification, explicit authority, auditability, and fresh authentication depending on consequence.

Identity or privilege transitions should not silently inherit security-sensitive session state established under materially weaker assumptions.

## Sessions and tokens

Sessions and tokens represent security state rather than permanent truth. Their relevant properties may include actor identity, authentication strength, scope, issuance time, expiry, revocation state, and contextual claims.

Possession of a syntactically valid token does not automatically prove that represented authority remains currently valid.

Credential scope and lifetime should reflect compromise consequence and operational requirements. Authority caching must also account for the risk of stale permissions after role, membership, ownership, or policy changes.

## Re-authentication

High-consequence actions may require fresh authentication evidence, such as account-recovery changes, credential creation, sensitive administrative operations, or other privileged transitions.

The Core defines the property, while Profiles and Patterns may define concrete triggers and mechanisms.

## Impersonation

> Impersonation must preserve the identity of the real actor.

Systems that allow an administrator, support operator, or automation to act as another subject must distinguish the initiating actor from the effective subject.

Impersonation should remain explicit, scoped, visible where appropriate, time-bounded when useful, and auditable according to project risk.

## Delegation

Delegated authority should identify who delegated what capability, to whom, within which scope, and for how long where relevant.

> Delegated authority must not exceed the authority from which it derives.

Re-delegation must not be assumed unless explicitly designed and permitted.

## Confused deputy protection

A privileged component must distinguish its own platform authority from authority it may legitimately exercise on behalf of a requesting actor.

> A privileged component must distinguish its own authority from the authority it is permitted to exercise on behalf of the requesting actor.

This applies to services, integrations, bots, background workers, and agentic runtimes that possess broader technical capabilities than the actor initiating a request.

## Agents as privileged deputies

Project content, external instructions, or user-controlled data do not gain authority merely because an agent with powerful tools can act on them.

Agentic execution should resolve the originating instruction source, delegated runtime authority, project governance, and protected effect before performing privileged actions.

## Service identity

Internal services should use appropriate machine identity where consequence requires it. Network location or private addressing does not itself establish trustworthy service identity.

Concrete mechanisms such as signed service tokens, mTLS, workload identity, or equivalent approaches belong to Profiles, Patterns, or Adapters.

Machine identities should support rotation and controlled lifecycle rather than implicitly depend on permanent static credentials.

## Authorization freshness and TOCTOU

Authorization can become stale between decision and effect. Security-critical decisions should therefore be evaluated sufficiently close to the protected operation to avoid material time-of-check/time-of-use gaps.

Caching may be used where justified, but the design must account for the consequence of delayed permission revocation or changed ownership.

## Failure behavior

When a privileged authorization decision cannot be established reliably, the protected effect should normally fail closed rather than infer permission.

Availability requirements may justify alternative designed behavior in specific systems, but privileged access must not silently become permissive because authorization infrastructure is unavailable.

## Information leakage

Authentication and authorization responses should consider whether distinctions reveal security-sensitive existence, identity state, tenant membership, resource presence, or privilege information.

The Core does not require identical errors for all systems, but disclosure should be intentional rather than accidental.

## Account recovery

> Account recovery is part of the authentication boundary and must not become an easier bypass around the primary authentication model.

Recovery, credential reset, ownership transfer, and equivalent mechanisms should receive security treatment proportional to the identity or authority they restore.

## Bootstrap authority

Initial privileged identity and authority establishment must be explicitly designed. Bootstrap paths for first administrators, service owners, or initial credentials must not remain accidentally open after initialization.

## Authorization verification

Authorization testing should include negative and abuse-oriented cases where relevant, such as:

- unprivileged actor denied,
- wrong-tenant actor denied,
- expired or invalid authentication denied,
- revoked or removed privilege denied,
- alternate access path denied,
- impersonated action retains real actor attribution.

> Positive permission tests establish capability; negative permission tests establish containment.

## Identity-related security invariants

Projects and Profiles may instantiate invariants such as:

- authenticated identity never implies resource authority by itself,
- client-supplied tenant scope never establishes membership,
- privileged effects require authoritative authorization enforcement,
- impersonation preserves real actor identity,
- delegation cannot create greater authority than its source.

These examples illustrate invariant structure rather than impose universal identifiers.

## Auditability

For sufficiently sensitive actions, useful decision evidence may include actor, effective subject, action, resource, policy basis, time, and authorization result.

Auditability should support incident response and accountability without forcing high-volume low-risk actions into unnecessary logging ceremony.

## Human and agent authority

Human ownership of project intent does not bypass technical security boundaries. Requests for privileged runtime action still resolve target, authority, scope, governance, and required approval according to the actual protected effect.

## Core principles

> **Identity is not authority.**

> **Authentication evidence must not be interpreted more broadly than the identity claim it actually establishes.**

> **Authorization evaluates an actor, an action, a resource, and relevant context.**

> **Client-supplied scope identifies a requested target; it does not establish authority over that target.**

> **Every privileged effect requires an authoritative enforcement point.**

> **Authorization must cover every relevant access path to the protected effect.**

> **Privilege elevation is a trust-boundary transition.**

> **Impersonation must preserve the identity of the real actor.**

> **Delegated authority must not exceed the authority from which it derives.**

> **A privileged component must distinguish its own authority from authority exercised on behalf of another actor.**

> **Authorization caching and token validity must account for stale authority.**

> **Account recovery is part of the authentication boundary, not an exception around it.**

> **Positive permission tests establish capability; negative permission tests establish containment.**
