---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Incident, Emergency & Security Learning Integration

**Foundation:** FOUNDATION-05H

## Purpose

The framework must respond to suspected or confirmed security incidents in a way that limits harm, preserves evidence, restores security properties, and feeds governed learning back into the system.

> Emergency response may temporarily change priorities, but it must not erase governance.

## Incident state

A suspected issue and a confirmed compromise are different states. The runtime should preserve uncertainty explicitly and gather evidence before escalating assumptions into facts.

Useful states may include:

- suspected,
- confirmed,
- contained,
- recovering,
- resolved,
- unknown.

## Containment

When credible ongoing harm exists, containment may take precedence over availability. Containment should use the smallest intervention that reliably limits damage.

## Emergency authority

Runtime emergency-authority semantics, delegation, and intervention permissions remain canonically defined by `runtime-safety-authority-and-intervention.md` (FOUNDATION-04G).

Incident response applies those rules to security events: emergency authority must already be predefined, scoped, temporary, and auditable, and it must not become a permanent bypass around normal governance or authorization.

## Unknown state

After interruption, compromise, or uncertain external effects, the runtime may preserve `UNKNOWN` rather than infer success, failure, or safety. Unknown security state should be resolved through observation and evidence before destructive or non-idempotent recovery actions are repeated.

## Secure recovery

Recovery must restore the affected security property, not merely return the service to an operational state.

Recovery paths remain subject to applicable trust boundaries, authorization, secret handling, isolation, and authority rules.

> Recovery is complete only when the security property is restored, not merely when the service runs again.

## Credential and session response

Where compromise may affect credentials, sessions, or delegated authority, the system should support revocation, rotation, or invalidation appropriate to the affected scope and risk.

## Evidence preservation

Containment and recovery should avoid unnecessarily destroying evidence that may be required to understand scope, cause, or impact. Evidence preservation remains subject to privacy, retention, and sensitivity rules.

## Learning integration

After containment and recovery, incident analysis should identify:

- root cause,
- affected security properties,
- failed or missing controls,
- signals that were ignored or detected late,
- excessive blast radius,
- process or routing failures.

These observations may become improvement candidates under FOUNDATION-04H. They do not automatically become permanent governance rules.

## Core principles

> **Containment may take precedence over availability when credible ongoing harm exists.**

> **Incident response uses the predefined runtime emergency-authority model rather than inventing a second authority system.**

> **Unknown security state must be resolved through evidence rather than assumption.**

> **Recovery paths remain subject to security boundaries.**

> **Recovery is complete only when the affected security property is restored.**

> **Incidents should improve the system through governed learning rather than ad-hoc permanent rules.**
