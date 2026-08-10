# SaaS Profile

- id: `saas`
- version: `0.1`
- status: `accepted`
- trust: `official`

## Domain Scope

This Profile specializes the framework for software delivered as an ongoing service where multiple users, accounts, organizations, tenants, plans, or operational service boundaries materially shape product behavior.

It does not own generic web architecture, payments, permissions, notifications, or provider implementation details.

## Applicability

Relevant when work materially involves one or more of:

- tenant or organization boundaries,
- account and membership lifecycle,
- plan, entitlement, quota, or service-tier behavior,
- service-owned persistence and operations,
- onboarding, offboarding, suspension, deletion, or recovery flows,
- cross-tenant or cross-account data exposure risk.

## Anti-Applicability

Do not activate merely because:

- software is hosted on a server,
- a web application has user accounts but no meaningful service/tenant domain,
- a project uses subscriptions only as a payment mechanism,
- a task is confined to an unrelated subsystem with no SaaS-domain effect.

## Domain Invariants

When applicable:

- tenant and organization boundaries that affect product behavior must be explicit enough to reason about and verify,
- account and membership lifecycle transitions must not leave ambiguous ownership or access state,
- plan or entitlement boundaries must be represented as product rules rather than inferred from incidental provider state,
- service operations that can affect multiple customers require proportional isolation and failure reasoning.

Universal authorization, data protection, security, and authority rules remain owned by Core.

## Risks and Failure Modes

Typical domain-specific failures include:

- cross-tenant data leakage,
- treating billing-provider state as the sole source of product entitlement truth,
- stale memberships retaining access after role/account changes,
- ambiguous ownership during account or organization transfer,
- deletion or suspension flows that leave active background access paths,
- global administrative shortcuts bypassing tenant boundaries,
- coupling business rules to one provider's subscription model.

## Risk Triggers and Quality Gates

### Tenant boundary changes

Trigger:
- storage, query, authorization, routing, caching, or background work changes can cross tenant or organization scope.

Additional verification:
- verify positive and negative tenant isolation,
- verify scope propagation across affected execution boundaries,
- verify failure behavior does not widen access.

### Membership or account lifecycle changes

Trigger:
- invite, join, remove, transfer, suspend, delete, recover, or ownership semantics change.

Additional verification:
- verify resulting authority and data ownership state,
- verify stale sessions/jobs/caches do not preserve invalid access where materially relevant,
- verify recovery and failure paths proportionately.

### Plan or entitlement changes

Trigger:
- feature access, quotas, usage limits, or service level depend on plan/entitlement state.

Additional verification:
- verify entitlement transitions,
- verify provider failure does not silently create unintended privilege,
- verify project truth is not replaced by opaque external billing state unless deliberately designed that way.

## Specialist Roles and Dispatch Signals

Potential specialist role:
- `SaaS Multi-Tenancy Specialist`

Useful dispatch signals include:
- tenant model changes,
- cross-tenant data paths,
- membership or organization ownership changes,
- entitlement architecture changes,
- lifecycle behavior that spans customer boundaries.

The Profile identifies expertise demand; the Runtime decides dispatch.

## Workflow and Review Extensions

When relevant SaaS risk triggers are active, work may require:

- explicit tenant-boundary analysis,
- negative isolation testing,
- lifecycle-state review,
- independent review for cross-tenant or entitlement-critical changes.

These extensions are risk-triggered and supplement Core Runtime behavior.

## Pattern Guidance

Commonly relevant Patterns may include:

- Permissions,
- Notifications,
- Payments,
- Audit/Eventing,
- Search,
- Settings.

SaaS applicability does not automatically activate these Patterns. Each remains independently discovered and selected.

## Decision Surface

This Profile does not decide:

- whether tenancy is row-, schema-, database-, project-, or service-isolated,
- the permission model,
- billing provider or payment architecture,
- plan catalog structure,
- user/organization hierarchy,
- data retention policy beyond domain-specific risk cues,
- deployment or hosting provider,
- exact operational SLOs.

Those remain project, Pattern, Core, or Adapter decisions according to ownership.

## Verification Guidance

When material to the task, test:

- positive and negative tenant isolation,
- account/membership lifecycle transitions,
- entitlement upgrades, downgrades, suspension, and expiry,
- stale-session or background-job behavior after authority changes,
- provider/service degradation without privilege widening,
- recovery from partial lifecycle failures.

## Composition

This Profile commonly composes with Web Application, API/Backend, Mobile App, or platform-specific Profiles such as Discord Platform.

Composition follows shared scope. A Discord integration inside a SaaS product may activate both Profiles only for the subsystem where both domains materially apply.

No global Profile precedence is implied.

## Evolution

SaaS practice evolves, but broad popularity alone does not justify new Profile rules. Material changes require evidence that the constraint is genuinely domain-specific and reusable rather than a project preference or Pattern concern.
