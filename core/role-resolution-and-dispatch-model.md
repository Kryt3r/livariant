---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Role Resolution & Dispatch Model

**Foundation:** FOUNDATION-04B

## Purpose

The Studio must resolve expertise from the needs of the current task rather than instantiate a fixed virtual team. Dispatch exists to close a material capability, reasoning, review, or risk gap.

> Roles are resolved from task need, not from a fixed virtual team.

## Resolution inputs

Role resolution may use signals including:

- task type,
- risk level,
- affected systems,
- decision class,
- governance requirements,
- design importance,
- uncertainty,
- profile-specific rules,
- available capabilities.

These inputs produce the required perspectives and appropriate depth for the current work.

## Activation classes

Roles may be activated as:

- **Required** — mandated by governance, risk, invariants, or profile rules.
- **Recommended** — expected to materially improve the outcome but not mandatory.
- **Opportunistic** — activated when new dependencies, risks, or uncertainties emerge during execution.

Role activation must be justified by contribution, not caution theater.

## Dispatch depth

A role does not imply maximum-depth work. The required depth should match consequence and uncertainty. Implementations may use levels such as light, focused, and deep where useful.

A lightweight boundary check and a deep adversarial security review are both valid Security work, but they serve different task conditions.

## Minimum Necessary Expertise

> Dispatch only expertise that can materially improve the outcome.

The Studio should use the smallest sufficient set of perspectives. Additional roles create coordination, context, token, time, and integration costs and therefore must earn their presence.

If the Director can reliably answer a low-impact question from existing project intelligence, specialist dispatch is unnecessary.

## Role bundling

Compatible expertise may be bundled into one execution context when this does not reduce required quality or independence.

For example, a backend implementer may also possess database expertise when no independent database perspective is materially required.

Bundling must never be used to bypass an independence requirement. A required independent reviewer cannot be satisfied by relabeling the implementation owner.

## Governance precedence

Mandatory governance gates cannot be optimized away because of token, time, model, or monetary cost. Resource optimization applies only within the discretionary part of dispatch.

If required capability is unavailable, the runtime must degrade transparently, record the limitation, and follow the relevant escalation or stop condition rather than silently pretending the requirement was satisfied.

## Profiles extend resolution

The Core defines general triggers. Profiles may add domain-specific dispatch rules without expanding universal Core policy.

Examples include guild-isolation review for Discord-specific mutations, economy review for repeatable resource generation in a game, or another domain-specific specialist for a profile-defined invariant.

Profile rules remain subordinate to applicable Core governance and cannot weaken mandatory Core requirements.

## Dynamic redispatch

Role resolution is not a one-time startup event. New evidence may reveal affected systems, risks, or uncertainty that were not visible during initial classification.

The Director should re-evaluate dispatch when material task state changes.

Roles may also be released when their presumed relevance disappears, provided no required review or governance obligation remains.

## Trigger evidence

For material dispatch decisions, the runtime should be able to explain why a role was activated. Useful evidence may include:

- triggering condition,
- source rule or invariant,
- required governance level,
- assigned depth,
- expected contribution.

This improves auditability and makes resolver behavior itself debuggable.

## Resource-aware dispatch

Discretionary dispatch should consider expected value, risk reduction, and coordination or execution cost.

The objective is not minimum token use. The objective is sufficient expertise without wasteful orchestration.

> Complexity must earn its existence.

## Repeated patterns improve the resolver

Manual dispatch decisions are operational evidence. When the same additional perspective is repeatedly needed under similar conditions, that pattern should be evaluated for consolidation into Core or profile-specific resolver rules.

> Repeated dispatch patterns are evidence for future resolver rules.

One occurrence does not automatically create a new global rule.

## Conceptual resolution flow

```text
1. Resolve mandatory roles
2. Resolve profile-specific roles
3. Identify material uncertainty
4. Add recommended expertise
5. Merge compatible roles
6. Preserve required independence
7. Assign depth
8. Check capability availability
9. Dispatch
10. Re-evaluate when task state changes
```

This is a reasoning model rather than a requirement to implement a heavyweight orchestration engine immediately.

## Core principles

> **Roles are resolved from task need, not from a fixed virtual team.**

> **Every dispatched role should have a material reason to exist.**

> **Mandatory governance roles cannot be optimized away for cost.**

> **Compatible expertise may be bundled unless independence would be weakened.**

> **Dispatch depth should match the consequence and uncertainty of the question.**

> **Role resolution is dynamic and may change as new evidence appears.**

> **Repeated manual dispatch patterns should improve future resolver rules.**

> **Dispatch exists to close a capability or reasoning gap, not to create activity.**
