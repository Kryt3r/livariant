---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Security Review, Evidence & Threat Modeling

**Foundation:** FOUNDATION-05G

## Purpose

Security work should be activated and deepened according to actual consequence, uncertainty, and affected trust boundaries rather than applied as uniform ceremony.

> Security depth should match consequence and uncertainty.

## Security review triggers

Security expertise should be considered when work materially affects areas such as:

- authentication or authorization,
- privilege transitions,
- secrets or sensitive data,
- isolation boundaries,
- production authority,
- external integrations,
- supply-chain trust,
- new or changed trust boundaries,
- high-consequence data or operational effects.

Triggering security consideration does not imply maximal review. Review depth remains proportional to risk.

## Proportional threat modeling

Threat modeling should occur early enough to influence design when security-relevant boundaries or abuse paths are changing.

Small changes may require only focused questions about attacker control, privileged effects, and affected boundaries. High-risk changes may require explicit attacker models, abuse paths, security properties, controls, and residual-risk analysis.

Threat modeling must remain useful reasoning rather than mandatory documentation ceremony.

## Security evidence

Security claims require evidence appropriate to the property being claimed. Evidence may include:

- negative authorization tests,
- isolation tests,
- abuse-path tests,
- static or dependency analysis,
- runtime observations,
- configuration verification,
- targeted security review,
- threat analysis.

> Security claims require evidence, not confidence.

## Negative verification

Positive tests demonstrate that intended capability works. Negative tests demonstrate containment.

Security-sensitive work should verify relevant forbidden behavior, not only successful behavior.

## Evidence freshness

Security evidence is bound to the state that produced it. Material changes to code, configuration, dependencies, authority, data flow, trust boundaries, or environment may invalidate earlier evidence and require targeted re-verification.

## Findings

Security findings should have severity, evidence, affected property or boundary, and a defined resolution path.

Critical or materially exploitable security findings must not be normalized into ordinary technical debt merely for delivery convenience.

## Review independence

Review independence follows the general I0/I1/I2 model. Higher-consequence or higher-uncertainty changes may require stronger reviewer independence.

Independence remains a property of the review process, not an intrinsic model capability.

## Threat model versus review

Threat modeling and security review are complementary:

- threat modeling asks what could go wrong and which properties require protection;
- security review evaluates whether the implementation and controls actually preserve those properties.

Neither automatically replaces the other.

## Runtime integration

Security review requirements should participate in task classification, role resolution, execution-graph planning, evidence collection, and targeted re-review rather than exist as an isolated final gate.

## Core principles

> **Security depth should match consequence and uncertainty.**

> **Security claims require evidence, not confidence.**

> **Negative verification is essential for proving containment.**

> **Material changes can invalidate earlier security evidence.**

> **Critical security findings cannot be normalized into ordinary technical debt.**

> **Threat modeling and security review are complementary, not interchangeable.**
