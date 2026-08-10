---
type: framework-layer-policy
status: accepted
domain: profiles
language: en
owner: framework
foundation: FOUNDATION-07E
---

# Profile Specialist Roles & Dispatch Triggers

Profiles may identify domain-specific expertise that becomes valuable under recurring conditions, but Profile activation does not imply permanent activation of every specialist role associated with that Profile.

> Profiles identify when domain expertise matters; the Runtime still decides how that expertise is dispatched.

## Specialist role purpose

A Profile may define Specialist Roles when a domain repeatedly requires expertise that is materially distinct from generic engineering, security, design, product, or review roles.

Examples may include:

- Discord Platform Specialist,
- Game Performance Specialist,
- SaaS Multi-Tenancy Specialist,
- Mobile Platform Specialist.

A Specialist Role exists to represent reusable domain expertise, not to create organizational decoration or agent-count inflation.

## Dispatch triggers

Profiles should expose concrete signals that indicate when specialist expertise may be useful.

Conceptually:

```text
Domain-relevant change or risk signal
↓
Profile dispatch trigger matches
↓
Specialist expertise becomes a candidate
↓
Runtime resolver evaluates task risk, scope, existing roles, and coordination cost
↓
Dispatch only when materially useful
```

Examples:

```text
Discord interaction lifecycle changes
→ Discord Platform Specialist may be relevant

Frame-critical rendering path changes
→ Game Performance Specialist may be relevant

Tenant ownership model changes
→ SaaS Multi-Tenancy Specialist may be relevant
```

## Trigger semantics

A dispatch trigger signals expertise demand. It does not itself:

- start a multi-agent workflow,
- assign authority,
- create a mandatory review,
- override Runtime dispatch rules,
- or require a specialist for every task in the Profile's domain.

The existing Runtime resolver remains responsible for deciding whether additional expertise is necessary and how it should be coordinated.

## Proportional dispatch

Specialist dispatch must remain proportional to the task.

A Profile may provide stronger dispatch signals when work materially affects domain-specific invariants, quality gates, trust boundaries, performance constraints, platform contracts, or other high-consequence concerns.

Low-risk work should not become coordination-heavy merely because a Profile defines specialists.

## Role creation threshold

A dedicated Specialist Role should normally exist only when most of the following are true:

- the expertise is materially distinct from existing generic roles,
- the knowledge is repeatedly useful within the Profile's domain,
- dispatch conditions can be described meaningfully,
- the specialist can improve decisions, implementation, verification, or review outcomes,
- the role does not merely duplicate a technology name or job title.

If a generic role can handle the concern effectively with Profile context, creating a new Specialist Role is unnecessary.

## No capability-to-authority promotion

Specialist knowledge does not grant additional execution authority by itself.

A Specialist Role remains subject to the framework's normal capability, authority, approval, escalation, and runtime-safety rules.

A Profile may identify expertise requirements but must not silently enlarge what an agent or tool is permitted to do.

## Multi-Profile dispatch

When multiple active Profiles surface specialists for the same task, the Runtime should evaluate the actual expertise gap rather than dispatch every suggested role independently.

Overlapping specialists may be consolidated, one may cover the material concern, or multiple specialists may be justified when their expertise is genuinely distinct.

Profile composition must therefore not become agent multiplication by default.

## Learning boundary

Repeated manual dispatch of the same specialist under similar conditions may become evidence for improving a Profile trigger.

Likewise, repeated specialist activation without meaningful contribution is evidence that a trigger or role may be overfit.

Such observations may generate improvement proposals but must not silently rewrite Profile dispatch behavior.

## Principles

> **Profiles identify when domain expertise matters; the Runtime still decides how that expertise is dispatched.**

> **A dispatch trigger signals possible expertise need; it is not an orchestration command.**

> **Specialist roles must earn their existence through distinct, repeated domain value.**

> **Profile activation must not cause permanent or indiscriminate specialist activation.**

> **Domain expertise does not create additional runtime authority.**
