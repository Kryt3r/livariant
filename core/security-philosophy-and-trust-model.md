---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Security Philosophy & Trust Model

**Foundation:** FOUNDATION-05A

## Purpose

Security is a system property created by how boundaries, assumptions, authority, data, and failure behavior are designed across the product lifecycle. It must not be treated as a final feature, scanner pass, or specialist-owned afterthought.

> Security is a property of boundaries, assumptions, authority, and failure behavior — not a final feature or review step.

## Protected properties first

Security reasoning should begin by identifying what must remain true rather than immediately enumerating vulnerability names.

Relevant protected properties may include:

- confidentiality,
- integrity,
- availability,
- authenticity,
- authorization,
- isolation,
- privacy,
- auditability.

A threat matters because it can violate one or more protected properties.

## Deliberate trust

> Trust must be granted deliberately, never inferred from convenience or location.

Relevant data or control flows should be able to answer questions such as:

- who or what produced this input,
- why it is trusted,
- what it can influence,
- what happens if it is malicious, stale, forged, compromised, or simply wrong.

Trust decisions may apply to users, services, databases, webhooks, integrations, runtime components, environment configuration, agents, and other actors.

## Trust boundaries

A **Trust Boundary** exists wherever data, identity, authority, or control crosses between contexts with materially different trust assumptions.

Trust boundaries are not limited to network edges. Examples may include:

- browser → backend,
- public API → internal service,
- user → administrator,
- tenant → tenant,
- plugin → host,
- third-party integration → application,
- staging → production,
- agent → authority gate,
- service → service.

## Boundary controls

> Every meaningful trust-boundary crossing requires controls appropriate to what is crossing.

Depending on the boundary, controls may include:

- input validation,
- authentication,
- authorization,
- integrity verification,
- authenticity verification,
- replay protection,
- tenant-isolation checks,
- constrained deserialization or execution,
- rate or abuse controls.

The framework does not require identical controls at every boundary. Controls must match the property at risk and the actual threat model.

## Authentication and authorization

Authentication and authorization are distinct security functions.

> Authentication establishes who or what an actor is; authorization establishes what that actor may do.

An authenticated actor must not be treated as authorized merely because identity is known.

Authorization decisions should consider the requested action, target resource, relevant scope, and current policy at the trusted enforcement point.

## Server-side enforcement

> Client-side restrictions are UX, not security enforcement.

Hidden controls, client routing, disabled buttons, or other presentation-layer restrictions may improve usability but do not establish authorization.

Privileged effects must be enforced at a trusted server-side or equivalent authoritative boundary.

## Default deny

When required authority has not been established, the system should deny or defer rather than infer permission.

Examples include unknown permission state, missing tenant scope, invalid identity, or incomplete privileged context.

Default-deny behavior should remain proportional to the actual boundary and should not create unnecessary authorization machinery inside purely internal implementation details that do not cross a meaningful trust boundary.

## Least privilege

> Every actor, service, credential, agent, and runtime component should receive the least privilege required for its responsibility.

Permissions should not be granted merely because they may be convenient later.

Least privilege reduces both accidental damage and the blast radius of compromise.

## Reduce trust assumptions

> Prefer designs that remove trust assumptions over designs that merely surround them with additional checks.

For example, deriving an actor identity from an authenticated session is usually stronger than accepting an arbitrary actor identifier from an untrusted client and then attempting to validate it repeatedly.

Security architecture should remove entire classes of unsafe assumptions where practical rather than endlessly compensate for them.

## Security invariants

Projects may define durable security invariants describing properties that must not be violated.

Examples include tenant isolation, prohibition of secrets in repository history, or mandatory authorization before privileged mutation.

Relevant security invariants should influence task classification, role resolution, review depth, verification, and completion gates.

They may evolve only through the framework's normal governance and decision processes.

## Internal does not mean trusted

> Internal network or system location does not automatically imply trustworthiness.

Internal services, workers, queues, databases, operators, and automation may be compromised, stale, misconfigured, or incorrect.

Trust should follow authenticated identity, explicit boundaries, granted authority, and validated assumptions rather than network location alone.

Stored data likewise has provenance but should not automatically be treated as safe merely because it already exists in a database.

## Agent and instruction trust

Agent reasoning is not automatically security evidence.

> Agent output is advisory until validated by the authority and evidence required for the resulting action.

External or project-controlled content may contain instructions intended to manipulate an agent. Instructions originating from repository content, websites, issues, logs, dependencies, user-controlled data, generated text, or other untrusted sources must not automatically gain runtime authority.

A piece of content may be relevant evidence without becoming governance.

## Threat reasoning

Security-relevant work should identify plausible abuse paths before implementation depth makes them unnecessarily expensive to correct.

Threat reasoning should remain proportional to risk. Useful questions include:

- what can an attacker control,
- which trust boundary is crossed,
- which privileged effect is possible,
- which protected property could be violated,
- what containment exists if a control fails.

## Attacker model

Security analysis may distinguish actors such as:

- unauthenticated external actor,
- authenticated normal user,
- malicious tenant member,
- compromised privileged account,
- malicious integration,
- compromised dependency,
- insider or operator,
- compromised agent or tool.

The relevant attacker model depends on project context. The Core does not require every project to model every actor class.

## Prevention and containment

Security design should consider both preventing compromise and limiting the consequences when prevention fails.

> Least privilege and blast-radius reduction are complementary security goals.

The **blast radius** is the maximum plausible damage that can result from compromise or control failure within the relevant design.

Architectures should avoid allowing compromise of one low-scope component to automatically compromise unrelated tenants, environments, secrets, or privileged systems.

## Defense in depth

Defense in depth is useful when layers provide meaningfully independent resistance to failure.

> Defense in depth should provide independent failure resistance, not duplicated ceremony.

Several equivalent checks at the same weak boundary are not necessarily stronger than one well-designed enforcement point plus an independent containment layer.

## Secure failure behavior

Security-critical uncertainty should normally fail toward the safer designed state.

If authorization, identity, integrity, or another material security condition cannot be established, the system should not silently grant privilege.

Availability requirements may justify deliberately designed alternatives, but fail-open behavior for security-critical boundaries must be explicit rather than accidental.

> Security-critical uncertainty should fail toward the safer designed state.

## Error disclosure

Errors should provide enough information for legitimate recovery and diagnosis without unnecessarily disclosing sensitive internals, secrets, stack traces, implementation details, or attack-relevant information to untrusted callers.

Detailed diagnostics may exist in appropriately protected internal evidence while external responses remain intentionally constrained.

## Security and privacy

Security and privacy overlap but are not identical.

Security protects confidentiality, integrity, availability, authority, and related properties. Privacy additionally asks whether data should be collected, retained, linked, or exposed at all.

Data minimization can reduce security risk because information that does not need to exist cannot become part of the breach surface.

The Core establishes the principle without embedding jurisdiction-specific legal requirements.

## Shared responsibility

Security is not owned exclusively by a Security specialist.

Architecture, implementation, product decisions, operations, runtime authority, and verification all affect security properties. Security specialists provide focused expertise and adversarial review but do not remove responsibility from the Director or other roles.

## Security evidence

Security claims should be supported by appropriate evidence where consequence justifies it. Evidence may include:

- negative tests,
- authorization tests,
- isolation tests,
- static analysis,
- dependency verification,
- runtime observation,
- security review,
- threat analysis.

The exact evidence requirements are defined by later security policy and project/profile rules.

## Living security assumptions

> Security assumptions must remain revisitable as systems, dependencies, and threat conditions evolve.

A previously valid trust assumption, threat model, control, or review result may become stale as architecture, providers, dependencies, attacker capability, or operational context changes.

Security knowledge therefore participates in the framework's normal freshness, evidence, review, and learning lifecycle.

## Security reasoning loop

```text
Identify protected property
↓
Identify actors and trust boundaries
↓
Identify attacker-controlled inputs / capabilities
↓
Determine possible boundary violations
↓
Reduce trust assumptions
↓
Apply least privilege and isolation
↓
Add independent controls where consequence justifies it
↓
Define negative / abuse-path verification
↓
Review
↓
Observe and learn
```

The objective is security by design and evidence, not post-hoc hope.

## Core principles

> **Security is a property of boundaries, assumptions, authority, and failure behavior — not a final feature or review step.**

> **Trust must be granted deliberately, never inferred from convenience or location.**

> **Every meaningful trust-boundary crossing requires controls appropriate to what is crossing.**

> **Authentication establishes identity; authorization establishes permitted action.**

> **Client-side restrictions are UX, not security enforcement.**

> **Prefer designs that remove trust assumptions over designs that merely surround them with additional checks.**

> **Least privilege and blast-radius reduction are complementary security goals.**

> **Internal does not automatically mean trusted.**

> **Agent output and external instructions remain untrusted until validated through applicable authority and evidence.**

> **Defense in depth should provide independent failure resistance, not duplicated ceremony.**

> **Security-critical uncertainty should fail toward the safer designed state.**

> **Security assumptions must evolve as the system and threat environment evolve.**
