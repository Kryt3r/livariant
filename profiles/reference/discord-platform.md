# Discord Platform Profile

- id: `discord-platform`
- version: `0.1`
- status: `accepted`
- trust: `official`

## Domain Scope

This Profile specializes the framework for software whose product behavior materially depends on Discord platform concepts such as interactions, commands, guilds, channels, members, events, and Discord-specific lifecycle constraints.

It is a domain Profile, not a Discord SDK or provider adapter.

## Applicability

Relevant when work materially involves one or more of:

- Discord interactions or application commands,
- guild, channel, member, or role context,
- event-driven Discord behavior,
- Discord-specific response timing or lifecycle behavior,
- Discord platform rate-limit behavior,
- user-visible behavior mediated through Discord.

## Anti-Applicability

Do not activate merely because:

- a project contains a Discord library but current work does not affect Discord-facing behavior,
- Discord is only an optional notification destination,
- a task is entirely local to an unrelated subsystem,
- the relevant concern is purely SDK/provider wiring that belongs to an Adapter.

## Domain Invariants

When applicable:

- Discord-facing behavior must respect the platform lifecycle and scope that governs the affected interaction or event.
- Guild-, channel-, member-, and role-derived context must not be treated as interchangeable project-level authority without an explicit project decision.
- Platform response constraints that can affect correctness must be treated as product/runtime constraints rather than incidental implementation details.
- Platform-specific limits must not be bypassed by assumptions that are valid only outside Discord.

These invariants specialize the domain. Universal authorization, security, evidence, and runtime authority requirements remain owned by Core.

## Risks and Failure Modes

Typical domain-specific failures include:

- interaction acknowledgement or response timing failures,
- assuming guild context where a DM or other context is possible,
- confusing Discord role membership with application authorization,
- event duplication or re-delivery being treated as impossible,
- rate-limit handling coupled too tightly to business logic,
- SDK-specific behavior being elevated into permanent domain policy,
- stale or incomplete Discord context causing incorrect platform-specific behavior.

## Risk Triggers and Quality Gates

### Interaction lifecycle changes

Trigger:
- command, interaction, modal, component, or response lifecycle behavior changes.

Additional verification:
- validate the relevant Discord lifecycle constraints,
- verify timeout/acknowledgement behavior where applicable,
- test failure and retry paths proportionately.

### Guild or member scope changes

Trigger:
- behavior changes based on guild, member, channel, or role context.

Additional verification:
- verify scope assumptions,
- verify that project authorization decisions remain authoritative,
- test non-guild or unexpected-context behavior when materially possible.

### High-volume event or messaging changes

Trigger:
- behavior can materially increase Discord API/event traffic.

Additional verification:
- verify rate-limit and retry behavior,
- verify graceful degradation under provider throttling.

## Specialist Roles and Dispatch Signals

Potential specialist role:
- `Discord Platform Specialist`

Useful dispatch signals include:
- interaction lifecycle changes,
- ambiguous Discord scope semantics,
- complex guild/channel/member behavior,
- platform rate-limit or event-delivery risk,
- Discord-specific behavior that generic engineering knowledge may misread.

The Profile identifies expertise demand; the Runtime decides whether and how to dispatch it.

## Workflow and Review Extensions

When a Discord-specific risk trigger is active, relevant work may require:

- explicit platform-constraint review,
- negative testing for unsupported Discord contexts,
- verification of throttling/degradation behavior,
- independent review when platform semantics materially affect authorization or user-visible correctness.

These extensions supplement existing Runtime workflows; they do not create a parallel orchestration system.

## Pattern Guidance

Commonly relevant Patterns may include:

- Permissions,
- Notifications,
- Messaging,
- Audit/Eventing where later defined.

A Pattern is discovered and selected independently. Discord relevance does not automatically activate any Pattern.

## Decision Surface

This Profile does not decide:

- how Discord guilds map to application tenants or organizations,
- the application's permission model,
- whether a role, command, or channel grants product authority,
- which Discord SDK/library/provider implementation is used,
- persistence architecture,
- retry architecture beyond domain constraints,
- product UX or command structure.

Those remain project, Pattern, or Adapter decisions according to ownership.

## Verification Guidance

When material to the task, test:

- correct and incorrect Discord contexts,
- interaction timing/lifecycle behavior,
- provider throttling or rate-limit paths,
- duplicate/re-delivered event behavior where relevant,
- separation between Discord context and application authority,
- degradation when Discord is unavailable.

## Composition

This Profile commonly composes with Profiles such as SaaS, Web Application, or API/Backend.

Composition must be scope-based. For example, a SaaS application may expose a Discord integration without making the entire product a Discord-domain subsystem.

No Profile priority order is implied.

## Evolution

Material changes to Discord platform semantics may require Profile revision and impact review. New Profile versions do not silently rewrite existing project decisions.
