# Profile Workflow and Review Extensions

## Purpose

Profiles may extend the framework's existing workflows when a domain introduces additional risks, constraints, verification needs, or review expertise that universal Core behavior cannot reasonably encode.

Profiles do not create a parallel orchestration system. They contribute domain-specific signals and requirements to the existing Studio Runtime and review model.

> **Profiles extend workflows where domain-specific risk requires it; they do not create a parallel orchestration system.**

## Workflow Extension Model

A Profile may define additional workflow behavior when all of the following are true:

- the trigger is materially specific to the Profile's domain,
- the additional step addresses a concrete risk, invariant, compatibility concern, or evidence need,
- the step is relevant only within the affected scope,
- the extension does not duplicate universal Core workflow requirements,
- and the added process is proportional to the risk involved.

A workflow extension should normally express:

`domain trigger -> affected scope -> required additional analysis, review, or verification`

Examples include:

- a Discord Platform Profile requesting platform-lifecycle checks when interaction handling changes,
- a Game Development Profile requesting compatibility analysis when savegame schemas change,
- a SaaS Profile requesting additional tenant-isolation verification when tenant data flows change.

## Runtime Ownership

Profiles identify domain-specific workflow needs. The Studio Runtime remains responsible for orchestration.

A Profile may therefore state that:

- additional domain analysis is required,
- a specialist perspective is relevant,
- independent review is appropriate,
- additional evidence is required before completion,
- or a domain-specific verification step must occur.

A Profile must not hard-code orchestration mechanics such as a fixed number of agents, mandatory parallelism, provider selection, or a separate execution pipeline unless such mechanics are themselves an unavoidable domain requirement.

The Runtime resolves how the requirement is satisfied using the framework's existing proportional orchestration rules.

## Review Extensions

A Profile may extend review requirements with domain-specific expectations such as:

- additional reviewer expertise,
- specific evidence requirements,
- negative-path or failure-mode testing,
- compatibility verification,
- platform-policy or lifecycle checks,
- stronger completion criteria for high-risk domain changes.

Review extensions must be tied to a concrete trigger or risk. Merely identifying a practice as generally desirable is insufficient to justify a mandatory gate.

## Scope and Proportionality

Workflow and review extensions apply only where their trigger and affected scope are present.

An active Profile does not imply that every task in the project receives every Profile-defined workflow step.

Low-risk or unrelated work should remain lightweight. For example, a static copy change in a SaaS application should not automatically trigger tenant-isolation review merely because the SaaS Profile is active.

The extension burden should scale with:

- the risk introduced,
- the reach of the change,
- the reversibility of failure,
- the sensitivity of affected data or users,
- and the cost of an undetected domain-specific defect.

## Relationship to Core

Profiles inherit applicable Core workflow, review, security, decision, and verification requirements.

A Profile may specialize or strengthen those requirements where the domain creates additional concrete constraints. It may not weaken, bypass, redefine, or silently replace Core requirements.

If a Profile extension conflicts with an applicable Core invariant or authority boundary, the Profile extension is invalid rather than authoritative.

## Relationship to Specialist Dispatch

Workflow extensions may produce a need for specialist expertise, but they do not directly own dispatch execution.

The flow is:

`Profile detects domain-specific need -> Runtime evaluates required expertise and orchestration -> appropriate role or review path is selected proportionally`

This preserves the separation between domain knowledge and runtime coordination.

## Anti-Patterns

Profiles should avoid:

- mandatory review steps without a concrete domain-specific trigger,
- duplicating universal Core process under Profile ownership,
- fixed multi-agent rituals for routine work,
- blanket activation of every Profile gate for every task,
- using workflow complexity as a proxy for quality,
- and defining a second orchestration model alongside the Studio Runtime.

## Decision Surface

Projects may still decide, within applicable Core and Profile constraints:

- which tools satisfy a required review or verification step,
- how specialist expertise is sourced,
- which implementation-specific evidence is appropriate,
- and how project-specific workflows integrate with Profile requirements.

Those choices become Project Brain knowledge where materially relevant.
